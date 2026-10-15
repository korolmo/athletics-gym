// Локальный запуск собранного приложения так же, как на хостинге (ADR 0004): dist/hosting/start.cjs,
// с переменными из .env и тем же пределом кучи, что в Plesk (NODE_OPTIONS=--max-old-space-size=160).
// Перед запуском: npm run build && node scripts/standalone/assemble.mjs
// Порт — PORT (по умолчанию 3100).

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const app = path.resolve("dist", "hosting");
if (!fs.existsSync(path.join(app, "start.cjs"))) {
  console.error("Нет dist/hosting — сначала: npm run build && node scripts/standalone/assemble.mjs");
  process.exit(1);
}

const fromFile = fs.existsSync(".env") ? dotenv.parse(fs.readFileSync(".env")) : {};
// Папка Фото — от корня проекта, а не от dist/hosting: как на хостинге, вне папки выкатки
if (fromFile.MEDIA_DIR && !path.isAbsolute(fromFile.MEDIA_DIR)) fromFile.MEDIA_DIR = path.resolve(fromFile.MEDIA_DIR);

// Переменные из окружения главнее .env: так проверяют другую базу (DATABASE_URL=… npm run start:standalone)
const env = {
  ...fromFile,
  ...process.env,
  NODE_ENV: "production",
  PORT: process.env.PORT ?? "3100",
  NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=160",
};

const child = spawn(process.execPath, ["start.cjs"], { cwd: app, env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
