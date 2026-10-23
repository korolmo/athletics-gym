// Собирает public/errors/503.html из словарей (src/lib/errors/offline-page.ts).
// Запуск после правки текстов ошибок: npm run errors:build. Устаревший файл ловит тест offline-page.test.ts.

import fs from "node:fs";
import path from "node:path";
import { OFFLINE_FILE, offlinePage } from "../../src/lib/errors/offline-page";

const target = path.join(process.cwd(), "public", OFFLINE_FILE);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, offlinePage());
console.log(`Записано: public/${OFFLINE_FILE}`);
