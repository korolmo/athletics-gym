import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// Строка DATABASE_URL в формате Prisma → настройки драйвера mariadb (Prisma 7). Её же берут миграции на хостинге.
const require = createRequire(import.meta.url);
const { mariadbConfig, tlsByDefault } = require("../../scripts/standalone/db-config.cjs") as typeof import("../../scripts/standalone/db-config.cjs");

describe("mariadbConfig", () => {
  it("хостинг: 127.0.0.1, пароль с кодированием, без TLS", () => {
    const c = mariadbConfig("mysql://gym:p%40ss%2Fword@127.0.0.1:3306/athletics");
    expect(c).toMatchObject({ host: "127.0.0.1", port: 3306, user: "gym", password: "p@ss/word", database: "athletics", connectTimeout: 5000, acquireTimeout: 10000 });
    expect(c.ssl).toBeUndefined();
  });

  it("параметры Prisma: connection_limit, connect_timeout и pool_timeout (секунды)", () => {
    const c = mariadbConfig("mysql://u:p@localhost:3307/db?connection_limit=1&connect_timeout=20&pool_timeout=0");
    expect(c).toMatchObject({ port: 3307, connectionLimit: 1, connectTimeout: 20_000, acquireTimeout: 0 });
  });

  it("лимит соединений по умолчанию — как у Prisma 6, ядра × 2 + 1; явный — из аргумента", () => {
    expect(mariadbConfig("mysql://u:p@127.0.0.1/db").connectionLimit).toBeGreaterThanOrEqual(3);
    expect(mariadbConfig("mysql://u:p@127.0.0.1/db?connection_limit=7", { connectionLimit: 1 }).connectionLimit).toBe(1);
  });

  it("облачная база (TiDB Лаборатории) — TLS с проверкой сертификата, даже без параметров", () => {
    expect(mariadbConfig("mysql://u:p@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/athletics").ssl).toEqual({ rejectUnauthorized: true });
    expect(mariadbConfig("mysql://u:p@db.example.com/x?sslaccept=strict").ssl).toEqual({ rejectUnauthorized: true });
  });

  it("TLS по умолчанию — только для доменного имени: IP, localhost и сервисы Docker — без TLS", () => {
    for (const host of ["127.0.0.1", "10.0.0.5", "::1", "[::1]", "localhost", "mariadb", "twin-db", "app.localhost", "host.docker.internal"]) {
      expect(tlsByDefault(host), host).toBe(false);
    }
    expect(tlsByDefault("gateway01.eu-central-1.prod.aws.tidbcloud.com")).toBe(true);
    expect(mariadbConfig("mysql://root:twin@twin-db:3306/athletics").ssl).toBeUndefined();
  });

  it("явные параметры TLS главнее адреса", () => {
    expect(mariadbConfig("mysql://u:p@db.example.com/x?sslaccept=accept_invalid_certs").ssl).toEqual({ rejectUnauthorized: false });
    expect(mariadbConfig("mysql://u:p@db.example.com/x?sslmode=disable").ssl).toBeUndefined();
    expect(mariadbConfig("mysql://u:p@127.0.0.1/x?sslaccept=strict").ssl).toEqual({ rejectUnauthorized: true });
  });

  it("mariadb:// тоже подходит; без строки или чужая схема — понятная ошибка", () => {
    expect(mariadbConfig("mariadb://u:p@mariadb/db").host).toBe("mariadb");
    expect(() => mariadbConfig(undefined)).toThrow(/DATABASE_URL не задана/);
    expect(() => mariadbConfig("postgresql://u:p@h/db")).toThrow(/mysql:\/\//);
  });
});
