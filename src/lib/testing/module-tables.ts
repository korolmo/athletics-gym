import fs from "node:fs";
import path from "node:path";

// Только для тестов: граница модуля по данным (этап 6, ADR 0015). dependency-cruiser видит импорты, но не видит,
// в какие таблицы модуль ходит через общий клиент Prisma. Тест модуля (tables.test.ts) сверяет этот список
// со своими таблицами и чужими «до переноса владельца».

function sources(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(root, e.name);
    if (e.isDirectory()) return sources(full);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
  });
}

/** Модели Prisma, к которым обращаются файлы модуля (`db.<модель>.…`), по алфавиту. */
export function tablesUsedBy(moduleDir: string): string[] {
  const used = new Set<string>();
  for (const file of sources(moduleDir)) {
    for (const m of fs.readFileSync(file, "utf8").matchAll(/\bdb\.(?!\$)(\w+)\./g)) used.add(m[1]);
  }
  return [...used].sort();
}
