// Диагностика хостинга hoster.kz (этап 8, шаг 0). Один файл, без зависимостей.
// Запускается в Plesk как Node.js-приложение и отдаёт отчёт по HTTP.
// Значения переменных среды НЕ выводятся (только имена и несколько безопасных системных).
// После диагностики Node.js выключить, этот файл и plesk-diag-stress.log удалить.
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS: Passenger загружает файл через require, package.json рядом нет */

const http = require("http");
const https = require("https");
const net = require("net");
const fs = require("fs");
const os = require("os");
const path = require("path");
const v8 = require("v8");
const { execSync } = require("child_process");

const STRESS_LOG = path.join(__dirname, "plesk-diag-stress.log");
const MB = 1024 * 1024;

function tryDo(fn) {
  try {
    return fn();
  } catch (e) {
    return `ошибка: ${e && e.code ? e.code + " " : ""}${e && e.message ? e.message.split("\n")[0] : e}`;
  }
}

function read(file, maxLines) {
  return tryDo(() => {
    const text = fs.readFileSync(file, "utf8").trim();
    return maxLines ? text.split("\n").slice(0, maxLines).join("\n") : text;
  });
}

function sh(cmd) {
  return tryDo(() => execSync(cmd, { timeout: 5000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: "/bin/sh" }).trim());
}

function mb(n) {
  return typeof n === "number" ? `${(n / MB).toFixed(1)} МБ` : n;
}

function memoryUsage() {
  const m = process.memoryUsage();
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, mb(v)]));
}

function cgroup() {
  const self = read("/proc/self/cgroup");
  const out = { "/proc/self/cgroup": self };
  const v2 = typeof self === "string" ? self.split("\n").find((l) => l.startsWith("0::")) : null;
  if (v2) {
    const base = path.join("/sys/fs/cgroup", v2.slice(3));
    for (const f of ["memory.max", "memory.high", "memory.current", "memory.peak", "memory.swap.max", "pids.max", "cpu.max"]) {
      out[`v2 ${f}`] = read(path.join(base, f));
    }
  }
  for (const f of ["memory/memory.limit_in_bytes", "memory/memory.usage_in_bytes", "memory/memory.max_usage_in_bytes"]) {
    out[`v1 ${f}`] = read(path.join("/sys/fs/cgroup", f));
  }
  return out;
}

function writable(dir) {
  return tryDo(() => {
    const st = fs.statSync(dir);
    if (!st.isDirectory()) return "не папка";
    const probe = path.join(dir, `.plesk-diag-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probe, "x");
    fs.unlinkSync(probe);
    let free = "";
    if (fs.statfsSync) {
      const s = fs.statfsSync(dir);
      free = `, свободно на разделе ${mb(s.bavail * s.bsize)} из ${mb(s.blocks * s.bsize)}`;
    }
    return `запись есть${free}`;
  });
}

function listDir(dir) {
  return tryDo(() =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .map((d) => d.name + (d.isDirectory() ? "/" : ""))
      .sort()
      .join("  "),
  );
}

function libssl() {
  const dirs = ["/lib", "/lib64", "/usr/lib", "/usr/lib64", "/lib/x86_64-linux-gnu", "/usr/lib/x86_64-linux-gnu", "/lib/aarch64-linux-gnu", "/usr/lib/aarch64-linux-gnu"];
  const found = [];
  for (const d of dirs) {
    try {
      for (const f of fs.readdirSync(d)) if (/^libssl\.so/.test(f)) found.push(path.join(d, f));
    } catch {
      /* нет папки */
    }
  }
  return found.length ? found : "не найдено";
}

function httpsProbe(url) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = https.get(url, { timeout: 6000 }, (res) => {
      res.resume();
      resolve(`HTTP ${res.statusCode} за ${Date.now() - started} мс`);
    });
    req.on("timeout", () => req.destroy(new Error("таймаут 6 с")));
    req.on("error", (e) => resolve(`ошибка: ${e.code || ""} ${e.message}`));
  });
}

// Подключается к MariaDB и читает приветствие сервера: в нём версия. Логин не нужен, ничего не отправляем.
function mysqlProbe(host, port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port, timeout: 4000 });
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        sock.destroy();
        resolve(v);
      }
    };
    sock.on("data", (buf) => {
      // 4 байта заголовка пакета, 1 байт версии протокола, дальше строка версии до \0
      const end = buf.indexOf(0, 5);
      finish(`открыт, сервер: ${buf.slice(5, end > 5 ? end : 40).toString("latin1")}`);
    });
    sock.on("timeout", () => finish("таймаут"));
    sock.on("error", (e) => finish(`ошибка: ${e.code || e.message}`));
  });
}

async function report() {
  const home = os.homedir();
  const parent = path.dirname(__dirname);
  const report = {};

  report["Node"] = { version: process.version, versions: process.versions, execPath: process.execPath, argv: process.argv, cwd: process.cwd(), __dirname, pid: process.pid, ppid: process.ppid, uid: tryDo(() => process.getuid()), uptime_s: Math.round(process.uptime()) };

  const header = tryDo(() => process.report.getReport().header);
  report["ОС"] = {
    platform: process.platform,
    arch: process.arch,
    type: os.type(),
    release: os.release(),
    version: tryDo(() => os.version()),
    cpus: os.cpus().length + " × " + (os.cpus()[0] ? os.cpus()[0].model : "?"),
    loadavg: os.loadavg(),
    glibcRuntime: header && header.glibcVersionRuntime,
    glibcCompiler: header && header.glibcVersionCompiler,
    "/etc/os-release": read("/etc/os-release", 6),
    "/etc/redhat-release": read("/etc/redhat-release"),
    "ldd --version": sh("ldd --version 2>&1 | head -1"),
    "CloudLinux LVE": fs.existsSync("/proc/lve") ? "есть /proc/lve" : "нет /proc/lve",
  };

  report["OpenSSL (для Prisma)"] = {
    "process.versions.openssl": process.versions.openssl,
    "openssl version": sh("openssl version 2>&1"),
    libssl: libssl(),
  };

  report["Память"] = {
    "process.memoryUsage": memoryUsage(),
    "os.totalmem / freemem": `${mb(os.totalmem())} / ${mb(os.freemem())}`,
    "v8 heap_size_limit": mb(v8.getHeapStatistics().heap_size_limit),
    "/proc/meminfo": read("/proc/meminfo", 8),
    "/proc/self/status (Vm*)": tryDo(() => read("/proc/self/status").split("\n").filter((l) => /^(Vm|Rss|Threads)/.test(l)).join("\n")),
    "/proc/self/limits": read("/proc/self/limits"),
    cgroup: cgroup(),
    "Предыдущий стресс-тест (plesk-diag-stress.log)": fs.existsSync(STRESS_LOG) ? read(STRESS_LOG) : "не запускался — откройте этот адрес с ?stress=1",
  };

  report["ulimit -a"] = sh("ulimit -a 2>&1");

  const dirs = [...new Set([__dirname, parent, home, path.join(home, "httpdocs"), path.join(home, "private"), path.join(home, "tmp"), os.tmpdir(), "/tmp", process.cwd()])];
  report["Запись в папки"] = Object.fromEntries(dirs.map((d) => [d, writable(d)]));
  report["Содержимое папок (только имена)"] = { [home]: listDir(home), [parent]: listDir(parent), [__dirname]: listDir(__dirname) };

  report["Программы"] = Object.fromEntries(["node", "npm", "npx", "git", "mysql", "mariadb", "mysqldump", "openssl", "unzip", "tar", "passenger-config"].map((b) => [b, sh(`command -v ${b} 2>&1 || echo нет`)]));

  report["Passenger"] = {
    PhusionPassenger: typeof global.PhusionPassenger !== "undefined" ? "есть (запущено под Passenger)" : "нет",
    "process.env.PORT": process.env.PORT || "не задан",
  };

  // Только имена переменных среды; значения — для нескольких системных, где секретов нет.
  const safe = ["NODE_ENV", "HOME", "USER", "PWD", "TMPDIR", "PATH", "SHELL", "LANG", "TZ", "PASSENGER_APP_ENV", "NODE_OPTIONS"];
  report["Переменные среды"] = {
    имена: Object.keys(process.env).sort().join(" "),
    значения: Object.fromEntries(safe.filter((k) => k in process.env).map((k) => [k, process.env[k]])),
  };

  report["Время"] = { now: new Date().toISOString(), local: new Date().toString(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone };

  const [gh, npm, prisma, supabase, my1, my2] = await Promise.all([
    httpsProbe("https://github.com/"),
    httpsProbe("https://registry.npmjs.org/"),
    httpsProbe("https://binaries.prisma.sh/"),
    httpsProbe("https://supabase.com/"),
    mysqlProbe("127.0.0.1", 3306),
    mysqlProbe("localhost", 3306),
  ]);
  report["Исходящий HTTPS"] = { "github.com": gh, "registry.npmjs.org": npm, "binaries.prisma.sh": prisma, "supabase.com": supabase };
  report["MariaDB"] = {
    "127.0.0.1:3306": my1,
    "localhost:3306": my2,
    сокеты: ["/var/lib/mysql/mysql.sock", "/var/run/mysqld/mysqld.sock", "/tmp/mysql.sock"].map((s) => `${s}: ${fs.existsSync(s) ? "есть" : "нет"}`),
  };

  return report;
}

// Стресс-тест памяти: берём память шагами по 16 МБ до 448 МБ и пишем каждый шаг в файл.
// Если хостинг убьёт процесс, последняя строка файла покажет, на каком объёме это случилось.
function stress(res) {
  const keep = [];
  fs.writeFileSync(STRESS_LOG, `старт ${new Date().toISOString()}, pid ${process.pid}\n`);
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.write("Стресс-тест памяти: шаги по 16 МБ. Если страница оборвётся — процесс убит; откройте адрес без ?stress=1 и пришлите раздел «Предыдущий стресс-тест».\n\n");
  let step = 0;
  const tick = () => {
    try {
      keep.push(Buffer.alloc(16 * MB, 1)); // заполняем, чтобы память действительно была занята
      step++;
      const m = process.memoryUsage();
      const line = `шаг ${step}: взято ${step * 16} МБ, rss ${mb(m.rss)}, external ${mb(m.external)}`;
      fs.appendFileSync(STRESS_LOG, line + "\n");
      res.write(line + "\n");
      if (step * 16 >= 448) {
        fs.appendFileSync(STRESS_LOG, "дошли до 448 МБ, процесс жив\n");
        res.end("\nДошли до 448 МБ, процесс жив. Память освобождена.\n");
        keep.length = 0;
        return;
      }
      setTimeout(tick, 150);
    } catch (e) {
      fs.appendFileSync(STRESS_LOG, `ошибка на шаге ${step + 1}: ${e.message}\n`);
      keep.length = 0;
      res.end(`\nОшибка на шаге ${step + 1}: ${e.message}\n`);
    }
  };
  tick();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/favicon.ico") {
    res.writeHead(404).end();
    return;
  }
  if (url.searchParams.has("stress")) {
    stress(res);
    return;
  }
  try {
    const r = await report();
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
    res.end("Диагностика хостинга — скопируйте весь текст целиком\n\n" + JSON.stringify(r, null, 2) + "\n");
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Сбой диагностики: ${e && e.stack}`);
  }
});

// Passenger подменяет listen и сам выбирает порт; вне Passenger — PORT или 3000.
server.listen(process.env.PORT || 3000, () => console.log("plesk-diag запущен"));
