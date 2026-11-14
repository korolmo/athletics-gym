// SLO-панель страницы статуса (этап 5, решение 4): ряд burn rate, эпизоды тревог, постмортемы, график в SVG.
// Чистые функции без сети и файлов — их берёт report.mjs и тесты.
import { ALERTS } from "./sli.mjs";
import { currentBurn } from "./burn-alerts.mjs";

const HOUR = 3_600_000;

/**
 * Burn rate окон 1 ч и 6 ч, кончающихся на каждом часе за последние `hours` часов. null — данных в окне мало.
 * @returns {{ t: number, fast: number | null, slow: number | null }[]}
 */
export function burnSeries(checks, now, hours = 7 * 24) {
  const end = Math.floor(now / HOUR) * HOUR;
  const fast = ALERTS.find((a) => a.name === "fastBurn");
  const slow = ALERTS.find((a) => a.name === "slowBurn");
  const out = [];
  for (let t = end - (hours - 1) * HOUR; t <= end; t += HOUR) {
    out.push({ t, fast: currentBurn(checks, fast.windowMs, t), slow: currentBurn(checks, slow.windowMs, t) });
  }
  return out;
}

/**
 * Эпизоды тревог: подряд идущие часы, где burn вида не ниже порога. Это история тревог по данным — та же, что
 * присылал бы Telegram (ADR 0028), но и за время до него.
 * @returns {{ kind: "fastBurn" | "slowBurn", from: number, to: number, worst: number }[]}
 */
export function alertEpisodes(series) {
  const out = [];
  for (const a of ALERTS) {
    const key = a.name === "fastBurn" ? "fast" : "slow";
    let cur = null;
    for (const p of series) {
      const v = p[key];
      if (v !== null && v >= a.burn) {
        if (cur) {
          cur.to = p.t;
          cur.worst = Math.max(cur.worst, v);
        } else cur = { kind: a.name, from: p.t, to: p.t, worst: v };
      } else if (cur) {
        out.push(cur);
        cur = null;
      }
    }
    if (cur) out.push(cur);
  }
  return out.sort((x, y) => y.from - x.from);
}

/** Постмортемы из таблицы docs/postmortems/README.md: «| дата | [название](./файл.md) | статус |». */
export function postmortemsFromReadme(md) {
  const out = [];
  for (const line of md.split(/\r?\n/)) {
    const m = /^\|\s*([^|]+?)\s*\|\s*\[([^\]]+)\]\(\.\/([^)]+\.md)\)\s*\|\s*\**([^|*]+?)\**\s*\|$/.exec(line.trim());
    if (m) out.push({ date: m[1], title: m[2], file: m[3], status: m[4] });
  }
  return out;
}

/**
 * График burn за 1 ч (линия) и 6 ч (пунктир) с порогами тревог, в SVG без библиотек. Значения выше `cap` срезаются
 * по верхнему краю (подпись — настоящий максимум). Пустые часы — разрыв линии.
 */
export function burnChartSvg(series, { width = 820, height = 180, cap = 30 } = {}) {
  if (series.length === 0) return "";
  const pad = { l: 36, r: 8, t: 10, b: 22 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const x = (i) => pad.l + (series.length === 1 ? 0 : (i / (series.length - 1)) * w);
  const y = (v) => pad.t + h - (Math.min(v, cap) / cap) * h;
  const path = (key) => {
    let d = "";
    let pen = false;
    series.forEach((p, i) => {
      const v = p[key];
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const thresholds = ALERTS.map((a) => `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y(a.burn).toFixed(1)}" y2="${y(a.burn).toFixed(1)}" class="thr"/><text x="${pad.l - 4}" y="${(y(a.burn) + 4).toFixed(1)}" class="lbl" text-anchor="end">${String(a.burn).replace(".", ",")}</text>`).join("");
  const days = series
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => new Date(p.t).getUTCHours() === 0)
    .map(({ p, i }) => `<text x="${x(i).toFixed(1)}" y="${height - 6}" class="lbl" text-anchor="middle">${new Date(p.t).toISOString().slice(5, 10).replace("-", ".")}</text>`)
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Burn rate за 1 и 6 часов, по часам"><rect x="${pad.l}" y="${pad.t}" width="${w}" height="${h}" class="frame"/>${thresholds}<path d="${path("slow")}" class="slow"/><path d="${path("fast")}" class="fast"/>${days}</svg>`;
}
