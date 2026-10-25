// Замер холодного подключения к TiDB Лаборатории по фазам (этап 0, инцидент «таймаут TiDB»).
//   node --env-file=.env.lab scripts/lab/tidb-probe.mjs [замеров=8] [пауза, мин=12] [параллельных=0]
// Адрес — LAB_DATABASE_URL или DATABASE_URL; в вывод не попадает. Каждый замер — холодное подключение после паузы
// и сразу за ним тёплое (для сравнения); с [параллельных] > 0 — ещё столько подключений одновременно (так пул Prisma
// открывает соединения на Promise.all в seed). Одна строка JSON на подключение: фазы в мс от начала подключения.
// Протокол MySQL — вручную, чтобы разделить DNS, TCP, приветствие сервера, TLS, аутентификацию и первый запрос:
// драйверы (Prisma, mysql2) отдают только общее время.
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";
import { attemptPhases } from "./tidb-probe-core.mjs";

const raw = process.env.LAB_DATABASE_URL ?? process.env.DATABASE_URL;
if (!raw) {
  console.error("Нет LAB_DATABASE_URL / DATABASE_URL");
  process.exit(2);
}
const url = new URL(raw);
if (!url.hostname.endsWith(".tidbcloud.com")) {
  console.error("Отказ: скрипт только для TiDB Cloud Лаборатории");
  process.exit(2);
}
const count = Number(process.argv[2] ?? 8);
const pauseMin = Number(process.argv[3] ?? 12);
const parallel = Number(process.argv[4] ?? 0);
const TIMEOUT_MS = 30_000;

const CAP = {
  LONG_PASSWORD: 0x1,
  PROTOCOL_41: 0x200,
  SSL: 0x800,
  TRANSACTIONS: 0x2000,
  SECURE_CONNECTION: 0x8000,
  PLUGIN_AUTH: 0x80000,
};
const CLIENT_CAPS = CAP.LONG_PASSWORD | CAP.PROTOCOL_41 | CAP.SSL | CAP.TRANSACTIONS | CAP.SECURE_CONNECTION | CAP.PLUGIN_AUTH;

/** Пакеты MySQL из потока: 3 байта длины, 1 байт номера. */
class Packets {
  constructor(stream) {
    this.buf = Buffer.alloc(0);
    this.waiters = [];
    this.attach(stream);
  }
  attach(stream) {
    this.stream = stream;
    stream.on("data", (d) => {
      this.buf = Buffer.concat([this.buf, d]);
      this.flush();
    });
  }
  flush() {
    while (this.waiters.length && this.buf.length >= 4) {
      const len = this.buf.readUIntLE(0, 3);
      if (this.buf.length < 4 + len) return;
      const seq = this.buf[3];
      const body = this.buf.subarray(4, 4 + len);
      this.buf = this.buf.subarray(4 + len);
      this.waiters.shift()({ seq, body });
    }
  }
  next() {
    return new Promise((resolve) => {
      this.waiters.push(resolve);
      this.flush();
    });
  }
  send(seq, body) {
    const head = Buffer.alloc(4);
    head.writeUIntLE(body.length, 0, 3);
    head[3] = seq & 0xff;
    this.stream.write(Buffer.concat([head, body]));
  }
}

const sha = (alg, ...parts) => {
  const h = crypto.createHash(alg);
  for (const p of parts) h.update(p);
  return h.digest();
};
const xor = (a, b) => Buffer.from(a.map((x, i) => x ^ b[i]));

function scramble(plugin, password, nonce) {
  if (!password) return Buffer.alloc(0);
  const pw = Buffer.from(password, "utf8");
  if (plugin === "caching_sha2_password") return xor(sha("sha256", pw), sha("sha256", sha("sha256", sha("sha256", pw)), nonce));
  return xor(sha("sha1", pw), sha("sha1", nonce, sha("sha1", sha("sha1", pw))));
}

function parseGreeting(b) {
  let i = 1;
  const verEnd = b.indexOf(0, i);
  const version = b.subarray(i, verEnd).toString();
  i = verEnd + 1 + 4;
  const part1 = b.subarray(i, i + 8);
  i += 8 + 1 + 2 + 1 + 2 + 2;
  const authLen = b[i];
  i += 1 + 10;
  const part2Len = Math.max(13, authLen - 8);
  const part2 = b.subarray(i, i + part2Len - 1);
  i += part2Len;
  const pluginEnd = b.indexOf(0, i);
  const plugin = b.subarray(i, pluginEnd === -1 ? b.length : pluginEnd).toString();
  return { version, nonce: Buffer.concat([part1, part2]), plugin };
}

function header(caps) {
  const h = Buffer.alloc(32);
  h.writeUInt32LE(caps >>> 0, 0);
  h.writeUInt32LE(16 * 1024 * 1024, 4);
  h[8] = 45; // utf8mb4_general_ci
  return h;
}

const timeout = (ms, what) => new Promise((_, rej) => setTimeout(() => rej(new Error(`тайм-аут ${ms} мс: ${what}`)), ms).unref());

async function attempt(kind) {
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const port = Number(url.port || 4000);
  const t0 = performance.now();
  const marks = { t0 };
  const at = (name) => (marks[name] = performance.now());
  let phase = "dns";
  let sock;
  try {
    const run = async () => {
      const { address } = await dns.lookup(url.hostname, { family: 4 });
      at("dns");
      phase = "tcp";
      sock = net.connect({ host: address, port });
      await new Promise((res, rej) => sock.once("connect", res).once("error", rej));
      at("tcp");
      phase = "greeting";
      const packets = new Packets(sock);
      const greet = await packets.next();
      if (greet.body[0] === 0xff) throw new Error(`ERR в приветствии: ${greet.body.subarray(3).toString()}`);
      const g = parseGreeting(greet.body);
      at("greeting");
      phase = "tls";
      packets.send(1, header(CLIENT_CAPS));
      sock.removeAllListeners("data");
      const secure = tls.connect({ socket: sock, servername: url.hostname, minVersion: "TLSv1.2" });
      await new Promise((res, rej) => secure.once("secureConnect", res).once("error", rej));
      packets.attach(secure);
      at("tls");
      phase = "auth";
      let plugin = g.plugin || "mysql_native_password";
      const auth = scramble(plugin, password, g.nonce);
      packets.send(
        2,
        Buffer.concat([header(CLIENT_CAPS), Buffer.from(user + "\0"), Buffer.from([auth.length]), auth, Buffer.from(plugin + "\0")]),
      );
      let seq = 2;
      for (;;) {
        const p = await packets.next();
        seq = p.seq;
        const k = p.body[0];
        if (k === 0x00) break;
        if (k === 0xff) throw new Error(`ERR при входе: ${p.body.subarray(9).toString()}`);
        if (k === 0xfe) {
          // AuthSwitchRequest: другой способ входа и новая соль
          const end = p.body.indexOf(0, 1);
          plugin = p.body.subarray(1, end).toString();
          const nonce = p.body.subarray(end + 1, p.body[p.body.length - 1] === 0 ? p.body.length - 1 : p.body.length);
          packets.send(++seq, scramble(plugin, password, nonce));
        } else if (k === 0x01 && p.body[1] === 0x04) {
          // caching_sha2_password без кэша: пароль открытым текстом — только внутри TLS
          packets.send(++seq, Buffer.from(password + "\0"));
        }
        // 0x01 0x03 — быстрый вход принят, следом придёт OK
      }
      at("auth");
      phase = "query";
      packets.send(0, Buffer.concat([Buffer.from([0x03]), Buffer.from("SELECT 1")]));
      let eofs = 0;
      while (eofs < 2) {
        const p = await packets.next();
        if (p.body[0] === 0xff) throw new Error(`ERR на запросе: ${p.body.subarray(9).toString()}`);
        if (p.body[0] === 0xfe && p.body.length < 9) eofs++;
      }
      at("query");
      secure.end();
      return { version: g.version, plugin };
    };
    const info = await Promise.race([run(), timeout(TIMEOUT_MS, phase)]);
    return { t: new Date().toISOString(), kind, ok: true, ...attemptPhases(marks), ...info };
  } catch (e) {
    return { t: new Date().toISOString(), kind, ok: false, failedAt: phase, error: String(e?.message ?? e).slice(0, 200), ...attemptPhases(marks) };
  } finally {
    sock?.destroy();
  }
}

for (let i = 0; i < count; i++) {
  if (i > 0) await new Promise((r) => setTimeout(r, pauseMin * 60_000));
  console.log(JSON.stringify(await attempt("cold")));
  console.log(JSON.stringify(await attempt("warm")));
  if (parallel > 0) {
    for (const r of await Promise.all(Array.from({ length: parallel }, () => attempt("parallel")))) console.log(JSON.stringify(r));
  }
}
