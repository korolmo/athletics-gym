// Смоук после выкатки Лаборатории (ADR 0005, 0013): прод-двойник не видит поведения платформы Vercel (CDN, её страницы
// ошибок), поэтому живой адрес проверяем после каждой выкатки. Красный смоук — выкатка неуспешна.
//   node scripts/lab/smoke.mjs <адрес>                — обычная выкатка (production Лаборатории или превью PR)
//   node scripts/lab/smoke.mjs <адрес> --maintenance  — превью с MAINTENANCE_MODE=1: страница 503
// SMOKE_VERCEL_CURL=1 — запросы через `vercel curl` (превью закрыты защитой Vercel; нужен VERCEL_TOKEN).
// Только адреса Лаборатории: боевой сайт и его редирект скрипт не трогает.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { assertLabUrl } from "../monitor/sli.mjs";
import { parseCurlInclude, smokeChecks } from "./smoke-core.mjs";

const base = assertLabUrl(process.argv[2]?.replace(/\/+$/, "") ?? "");
const maintenance = process.argv.includes("--maintenance");
const viaVercel = process.env.SMOKE_VERCEL_CURL === "1";

/** GET без перехода по переадресациям: { status, headers (имена в нижнем регистре), body }. */
async function get(path, cookie) {
  if (viaVercel) {
    // Токен — из VERCEL_TOKEN (CI); локально vercel curl берёт вход из CLI
    const args = ["--yes", "vercel@50.4.9", "curl", path, "--deployment", base, ...(process.env.VERCEL_TOKEN ? ["--token", process.env.VERCEL_TOKEN] : [])];
    args.push("--", "--silent", "--include", "--max-time", "30", ...(cookie ? ["--header", `Cookie: ${cookie}`] : []));
    // На Windows npx — это .cmd, его запускает только оболочка: аргументы с пробелами берём в кавычки
    const win = process.platform === "win32";
    const r = spawnSync("npx", win ? args.map((a) => (/[\s;]/.test(a) ? `"${a}"` : a)) : args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, shell: win });
    if (r.status !== 0) throw new Error(`vercel curl ${path}: код ${r.status}`);
    return parseCurlInclude(r.stdout);
  }
  const r = await fetch(base + path, { redirect: "manual", headers: cookie ? { cookie } : {}, signal: AbortSignal.timeout(30_000) });
  return { status: r.status, headers: Object.fromEntries([...r.headers].map(([k, v]) => [k.toLowerCase(), v])), body: await r.text() };
}

const results = [];
for (const check of smokeChecks({ maintenance, nonce: Date.now().toString(36) })) {
  let problem;
  try {
    const responses = [];
    for (const req of check.requests) responses.push(await get(req.path, req.cookie));
    problem = check.verify(responses);
  } catch (e) {
    problem = e instanceof Error ? e.message : String(e);
  }
  results.push({ name: check.name, problem });
  console.log(`${problem ? "✗" : "✓"} ${check.name}${problem ? ` — ${problem}` : ""}`);
}

const failed = results.filter((r) => r.problem);
const lines = [`### Смоук Лаборатории${maintenance ? " (технические работы)" : ""}`, "", `${base}: ${results.length - failed.length} из ${results.length}`, ""];
for (const r of results) lines.push(`- ${r.problem ? "✗" : "✓"} ${r.name}${r.problem ? ` — ${r.problem}` : ""}`);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
if (failed.length) {
  console.error(`\nСмоук не пройден: ${failed.length} из ${results.length}`);
  process.exitCode = 1;
}
