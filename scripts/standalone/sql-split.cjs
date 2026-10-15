// Делит SQL миграции на отдельные запросы: Prisma выполняет по одному запросу за вызов.
// Точка с запятой внутри строк, имён в `обратных кавычках` и комментариев запрос не делит.
"use strict";

function splitSql(sql) {
  const out = [];
  let current = "";
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];
    if (c === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? n : end + 1;
      current += "\n";
      continue;
    }
    if (c === "#") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? n : end + 1;
      current += "\n";
      continue;
    }
    if (c === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      current += " ";
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "\\" && c !== "`") {
          j += 2;
          continue;
        }
        if (sql[j] === c) {
          if (sql[j + 1] === c) {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      current += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === ";") {
      if (current.trim()) out.push(current.trim());
      current = "";
      i++;
      continue;
    }
    current += c;
    i++;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

module.exports = { splitSql };
