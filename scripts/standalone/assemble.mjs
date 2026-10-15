// Собирает готовое приложение для хостинга hoster.kz (ADR 0004) в dist/hosting — это и есть содержимое ветки deploy.
// Только собранные файлы: без исходников, без .env и секретов, без sharp и typescript (на сервере не нужны).
// Запуск после `npm run build`: node scripts/standalone/assemble.mjs

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "dist", "hosting");
const STANDALONE = path.join(ROOT, ".next", "standalone");

if (!fs.existsSync(path.join(STANDALONE, "server.js"))) {
  console.error("Нет .next/standalone/server.js — сначала npm run build (output: standalone).");
  process.exit(1);
}

remove(OUT);
fs.mkdirSync(OUT, { recursive: true });

// Своё копирование и удаление вместо fs.cpSync и fs.rmSync: в Node 25 на Windows на путях с кириллицей
// cpSync падает, а rmSync молча ничего не удаляет
function remove(target) {
  let st;
  try {
    st = fs.lstatSync(target);
  } catch {
    return;
  }
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(target)) remove(path.join(target, name));
    fs.rmdirSync(target);
  } else {
    fs.unlinkSync(target);
  }
}

function copy(from, to) {
  const st = fs.statSync(from);
  if (st.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) copy(path.join(from, name), path.join(to, name));
  } else {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

copy(STANDALONE, OUT);
copy(path.join(ROOT, ".next", "static"), path.join(OUT, ".next", "static"));
remove(path.join(OUT, "public"));
copy(path.join(ROOT, "public"), path.join(OUT, "public"));
copy(path.join(ROOT, "prisma", "migrations"), path.join(OUT, "prisma", "migrations"));
for (const file of ["start.cjs", "migrate.cjs", "sql-split.cjs"]) copy(path.join(ROOT, "scripts", "standalone", file), path.join(OUT, file));

// На сервере не нужны: картинки не пересжимаются (sharp), типы не проверяются (typescript).
// Движки Prisma — из binaryTargets схемы (в CI на Linux — только Linux; локально на Windows остаётся свой)
for (const dir of ["node_modules/sharp", "node_modules/@img", "node_modules/typescript"]) {
  remove(path.join(OUT, dir));
}

// Секреты в ветку deploy не попадают: Next кладёт .env в standalone — убираем любые .env*
function removeEnvFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) removeEnvFiles(full);
    else if (/^\.env/.test(entry.name)) remove(full);
  }
}
removeEnvFiles(OUT);

// Passenger перезапускает приложение, когда меняется tmp/restart.txt
fs.mkdirSync(path.join(OUT, "tmp"), { recursive: true });
fs.writeFileSync(path.join(OUT, "tmp", ".gitkeep"), "");

const commit = process.env.GITHUB_SHA ?? "local";
fs.writeFileSync(
  path.join(OUT, "package.json"),
  JSON.stringify(
    {
      name: "athletics-gym-hosting",
      private: true,
      description: `Собрано автоматически из main (${commit}). Не править вручную: ветку deploy перезаписывает GitHub Actions.`,
      scripts: { start: "node start.cjs", "db:migrate": "node migrate.cjs" },
    },
    null,
    2,
  ) + "\n",
);
fs.writeFileSync(
  path.join(OUT, "README.md"),
  [
    "# Athletic's Gym — собранное приложение для hoster.kz",
    "",
    `Собрано из коммита ${commit} ветки main. Ветку deploy перезаписывает GitHub Actions после каждого merge в main.`,
    "Файл запуска для Plesk — `start.cjs` (сначала миграции, потом сервер). Настройка — docs/hosting-plesk.md в репозитории.",
    "",
  ].join("\n"),
);

// Список статических файлов сборки: при запуске start.cjs удаляет из .next/static и public/_img всё, чего в нём нет.
// Выкатка Plesk из Git удалённые из ветки файлы не стирает — без уборки старые сборки копились бы на диске 1 ГБ.
function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).split(path.sep).join("/")],
  );
}
const owned = [...listFiles(path.join(OUT, ".next", "static")).map((f) => `.next/static/${f}`), ...listFiles(path.join(OUT, "public", "_img")).map((f) => `public/_img/${f}`)];
fs.writeFileSync(path.join(OUT, "build-files.txt"), owned.sort().join("\n") + "\n");

// Проверка: ни одного .env и ни одного исходника TypeScript приложения
const leaks = [];
(function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(full);
    else if (/^\.env/.test(entry.name)) leaks.push(path.relative(OUT, full));
  }
})(OUT);
if (leaks.length) {
  console.error("В сборке остались файлы окружения:", leaks);
  process.exit(1);
}

function size(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? size(full) : fs.statSync(full).size;
  }
  return total;
}
console.log(`Готово: ${path.relative(ROOT, OUT)} — ${(size(OUT) / 1024 / 1024).toFixed(1)} МБ.`);
