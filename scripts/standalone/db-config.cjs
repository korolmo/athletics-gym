// Строка подключения DATABASE_URL (в формате Prisma: mysql://…?connection_limit=…&sslaccept=…) → настройки драйвера
// mariadb. С Prisma 7 (без движка на Rust) запросы идут через драйвер, а он параметров Prisma не понимает.
// Общий файл: его берут приложение (src/lib/db.ts), миграции на хостинге (migrate.cjs) и скрипты — поэтому CommonJS
// без зависимостей, кроме самого драйвера в openSingleConnection.
"use strict";

const os = require("node:os");

/**
 * Ждём ли TLS по умолчанию: да — для доменного имени (облачная база: TiDB Лаборатории); нет — для IP-адреса
 * (hoster.kz — 127.0.0.1) и имени без точки (localhost, сервис Docker: mariadb, twin-db). Драйвер не умеет «TLS, если
 * сервер может», как Prisma 6, поэтому решаем по адресу; явные sslaccept / sslmode главнее.
 */
function tlsByDefault(host) {
  const h = host.replace(/^\[|\]$/g, "");
  if (/^[\d.]+$/.test(h) || h.includes(":")) return false;
  return h.includes(".") && !h.endsWith(".localhost") && !h.endsWith(".internal");
}

function seconds(value, fallbackMs) {
  const n = Number(value);
  return value !== null && value !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) : fallbackMs;
}

/**
 * Настройки пула mariadb из строки подключения.
 * - connection_limit → connectionLimit; по умолчанию как у Prisma 6: ядра × 2 + 1.
 * - connect_timeout / pool_timeout (секунды) → connectTimeout / acquireTimeout; по умолчанию 5 и 10 с, как у Prisma 6.
 * - TLS: sslaccept=strict — с проверкой сертификата, accept_invalid_certs — без, sslmode=disable — без; иначе по адресу
 *   (tlsByDefault): доменное имя — с проверкой сертификата, IP-адрес и имя без точки — без TLS.
 * @param {string | undefined} raw
 * @param {{ connectionLimit?: number }} [override]
 */
function mariadbConfig(raw, override = {}) {
  if (!raw) throw new Error("DATABASE_URL не задана (Plesk → Node.js → Переменные среды, локально — .env).");
  const url = new URL(raw);
  if (url.protocol !== "mysql:" && url.protocol !== "mariadb:") throw new Error(`DATABASE_URL: ожидается mysql://, а не ${url.protocol}//`);
  const q = url.searchParams;
  const host = url.hostname;
  const sslaccept = q.get("sslaccept");
  const sslmode = q.get("sslmode");
  let ssl;
  if (sslaccept === "accept_invalid_certs") ssl = { rejectUnauthorized: false };
  else if (sslaccept === "strict" || sslmode === "require" || sslmode === "verify-full") ssl = { rejectUnauthorized: true };
  else if (sslmode === "disable" || !tlsByDefault(host)) ssl = undefined;
  else ssl = { rejectUnauthorized: true };

  const limit = Number(q.get("connection_limit"));
  return {
    host,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")) || undefined,
    connectionLimit: override.connectionLimit ?? (Number.isInteger(limit) && limit > 0 ? limit : os.availableParallelism() * 2 + 1),
    connectTimeout: seconds(q.get("connect_timeout"), 5_000),
    acquireTimeout: seconds(q.get("pool_timeout"), 10_000),
    ...(ssl ? { ssl } : {}),
  };
}

/**
 * Одно соединение для миграций (GET_LOCK держится на соединении) с методами как у PrismaClient, которыми пользуется
 * migrate.cjs: $queryRawUnsafe, $executeRawUnsafe, $disconnect.
 * @param {string | undefined} raw
 */
async function openSingleConnection(raw) {
  const mariadb = require("mariadb");
  // У одного соединения нет пула: лимит и ожидание соединения из пула ему не нужны
  const config = mariadbConfig(raw);
  delete config.connectionLimit;
  delete config.acquireTimeout;
  const conn = await mariadb.createConnection(config);
  return {
    $queryRawUnsafe: async (sql, ...params) => Array.from(await conn.query(sql, params)),
    $executeRawUnsafe: async (sql, ...params) => {
      const r = await conn.query(sql, params);
      return Number(r && r.affectedRows) || 0;
    },
    $disconnect: () => conn.end(),
  };
}

module.exports = { mariadbConfig, openSingleConnection, tlsByDefault };
