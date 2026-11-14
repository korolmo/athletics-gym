// Прежний код на новой схеме (ADR 0022, этап 3, решение 3). CI мигрирует базу кодом ветки, запускает на ней сборку
// из базы (предыдущий main) и этим скриптом обходит её страницы. Любой 5xx или обрыв — прежний релиз с новой схемой
// не работает: откат на него невозможен, а в Лаборатории старые экземпляры Vercel упадут на время выкатки.
//   node scripts/compat/old-code-new-schema.mjs http://127.0.0.1:3200 [кругов]
// Только локальный адрес: скрипт для CI, Лабораторию и боевой сайт не трогает.

/** Что обходим: страницы сайта и кабинета, API и проверки состояния — всё, что читает и пишет базу без сессии. */
export const PAGES = [
  "/ru",
  "/kk",
  "/ru/privacy",
  "/kk/terms",
  "/ru/cabinet/login",
  "/kk/cabinet/login",
  "/ru/cabinet",
  "/admin/login",
  "/robots.txt",
  "/sitemap.xml",
  "/api/health/live",
  "/api/health/ready",
  "/ru/opengraph-image",
  "/ru/nope",
];

/** Запись без сессии: Обращение (счётчик кнопок связи). */
export const WRITES = [{ path: "/api/contact", body: { channel: "whatsapp", source: "hero", locale: "ru" } }];

/**
 * Итог обхода: проблемы (5xx, обрывы, неготовая база) и сводка кодов.
 * @param {{ path: string, status: number | null, error?: string }[]} results
 */
export function verdict(results) {
  const problems = [];
  for (const r of results) {
    if (r.status === null) problems.push(`${r.path}: обрыв — ${r.error}`);
    else if (r.status >= 500) problems.push(`${r.path}: ${r.status}`);
  }
  const ready = results.filter((r) => r.path === "/api/health/ready");
  if (ready.length && ready.some((r) => r.status !== 200)) problems.push("/api/health/ready: база не готова для прежнего кода");
  const codes = {};
  for (const r of results) codes[r.status ?? "обрыв"] = (codes[r.status ?? "обрыв"] ?? 0) + 1;
  return { ok: problems.length === 0, problems: [...new Set(problems)], codes };
}

/** Только локальный адрес: CI поднимает прежнюю сборку на 127.0.0.1. */
export function assertLocal(raw) {
  const url = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) throw new Error(`Только локальный адрес, а не ${url.hostname}`);
  return url.origin;
}

async function main() {
  const base = assertLocal(process.argv[2] ?? "http://127.0.0.1:3200");
  const rounds = Number(process.argv[3] ?? 3);
  const results = [];
  const run = async (path, init) => {
    try {
      const r = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(30_000), ...init });
      await r.arrayBuffer();
      results.push({ path, status: r.status });
    } catch (e) {
      results.push({ path, status: null, error: e instanceof Error ? e.message : String(e) });
    }
  };
  for (let i = 0; i < rounds; i++) {
    await Promise.all(PAGES.map((p) => run(p)));
    for (const w of WRITES) await run(w.path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(w.body) });
  }
  const v = verdict(results);
  console.log(`Прежний код на новой схеме: ${results.length} запросов, коды ${JSON.stringify(v.codes)}`);
  if (!v.ok) {
    console.error(`Не совместимо:\n- ${v.problems.join("\n- ")}`);
    process.exitCode = 1;
  }
}

// Запуск из командной строки; при импорте в тест — только чистые функции
if (process.argv[1]?.endsWith("old-code-new-schema.mjs")) main();
