// Копии картинок из public/ в WebP нужных ширин — вместо оптимизатора next/image на сервере (ADR 0004).
// Результат — public/_img/<путь>-<ширина>.webp (папка в .gitignore); адреса подставляет src/lib/image-loader.ts.
// Запускается перед сборкой и dev-сервером; пропускает копии, которые новее исходника.
// Использует sharp — только здесь, при сборке; на сервер хостинга sharp не попадает.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import widths from "../../src/lib/image-widths.json" with { type: "json" };

const PUBLIC = path.resolve("public");
const OUT = path.join(PUBLIC, "_img");
const RASTER = /\.(jpe?g|png|webp)$/i;
// Иконки вкладки браузер берёт сами по себе, через next/image они не идут
const SKIP = /^(icon-|apple-icon)/;

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full !== OUT) yield* walk(full);
    } else if (RASTER.test(entry.name) && !SKIP.test(entry.name)) {
      yield full;
    }
  }
}

async function isFresh(out, sourceTime) {
  try {
    return (await fs.stat(out)).mtimeMs >= sourceTime;
  } catch {
    return false;
  }
}

let made = 0;
let kept = 0;
for await (const source of walk(PUBLIC)) {
  const rel = path.relative(PUBLIC, source).replace(RASTER, "");
  const sourceTime = (await fs.stat(source)).mtimeMs;
  for (const width of widths.public) {
    const out = path.join(OUT, `${rel}-${width}.webp`);
    if (await isFresh(out, sourceTime)) {
      kept++;
      continue;
    }
    await fs.mkdir(path.dirname(out), { recursive: true });
    await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
    made++;
  }
}
console.log(`Копии картинок public/_img: сделано ${made}, уже были ${kept}.`);
