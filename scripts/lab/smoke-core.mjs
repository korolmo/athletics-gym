// Проверки смоука (scripts/lab/smoke.mjs) — чистые функции: запросы и разбор ответов, без сети. Тест — smoke.test.ts.

/** @typedef {{ status: number, headers: Record<string, string>, body: string }} Res */
/** @typedef {{ path: string, cookie?: string }} Req */
/** @typedef {{ name: string, requests: Req[], verify: (responses: Res[]) => string | null }} Check */

const OUR_404 = 'data-error-page="404"';
const OUR_503 = 'data-error-page="503"';
// Страницы ошибок платформы и Next по умолчанию: если они вместо наших — Vercel подменил ответ (ADR 0013)
const FOREIGN = ["This page could not be found", "SERVICE_UNAVAILABLE", "DEPLOYMENT_NOT_FOUND", "FUNCTION_INVOCATION_FAILED"];

/** @param {string} body */
const foreign = (body) => FOREIGN.find((s) => body.includes(s));
/** @param {Res} r */
const cacheNote = (r) => (r.headers["x-vercel-cache"] ? ` (X-Vercel-Cache: ${r.headers["x-vercel-cache"]})` : "");

/** @param {Res} r */
function expect404(r) {
  if (r.status !== 404) return `код ${r.status}, ждём 404`;
  const f = foreign(r.body);
  if (f) return `страница платформы «${f}» вместо нашей${cacheNote(r)}`;
  if (!r.body.includes(OUR_404)) return `нет маркера ${OUR_404}${cacheNote(r)}`;
  // Обе языковые версии в HTML: нужную выбирает браузер по адресу или cookie
  if (!r.body.includes('lang="kk"') || !r.body.includes('lang="ru"')) return "нет одной из языковых версий (ru/kk)";
  return null;
}

/**
 * Список проверок: имя, запросы, разбор ответов → текст проблемы или null.
 * @param {{ maintenance: boolean, nonce: string }} options
 * @returns {Check[]}
 */
export function smokeChecks({ maintenance, nonce }) {
  if (maintenance) {
    /** @param {string} path @returns {Check} */
    const page503 = (path) => ({
      name: `${path} — 503 «технические работы»`,
      requests: [{ path }],
      verify: ([r]) => {
        if (r.status !== 503) return `код ${r.status}, ждём 503`;
        if (r.headers["retry-after"] !== "600") return `Retry-After «${r.headers["retry-after"] ?? ""}», ждём 600`;
        const f = foreign(r.body);
        if (f) return `страница платформы «${f}» вместо нашей`;
        if (!r.body.includes(OUR_503)) return `нет маркера ${OUR_503}`;
        return null;
      },
    });
    return [
      page503("/ru"),
      page503("/kk/privacy"),
      page503("/abc"),
      { name: "/api/health/live — 200 (API работает)", requests: [{ path: "/api/health/live" }], verify: ([r]) => (r.status === 200 ? null : `код ${r.status}`) },
      { name: "/admin/login — 200 (админка работает)", requests: [{ path: "/admin/login" }], verify: ([r]) => (r.status === 200 ? null : `код ${r.status}`) },
    ];
  }
  return [
    { name: "/ru — 200", requests: [{ path: "/ru" }], verify: ([r]) => (r.status === 200 ? null : `код ${r.status}`) },
    { name: "/ru/nope — наша 404", requests: [{ path: "/ru/nope" }], verify: ([r]) => expect404(r) },
    { name: "/kk/nope — наша 404", requests: [{ path: "/kk/nope" }], verify: ([r]) => expect404(r) },
    // Свежий адрес мимо кэша CDN: так видно, что отдаёт сама выкатка, а не прежний ответ из кэша
    { name: "свежий адрес — наша 404 мимо кэша", requests: [{ path: `/ru/smoke-${nonce}` }], verify: ([r]) => expect404(r) },
    {
      name: "/abc с cookie kk — наша 404, тот же HTML, что без cookie",
      requests: [{ path: "/abc", cookie: "NEXT_LOCALE=kk" }, { path: "/abc" }],
      verify: ([kk, plain]) => {
        if (kk.headers.location) return `переадресация на ${kk.headers.location}, ждём 404 сразу`;
        const p = expect404(kk);
        if (p) return p;
        // Страница одна на всех (язык выбирает браузер) — кэш CDN не может отдать «чужой» язык
        return kk.body === plain.body ? null : "HTML зависит от cookie — кэш CDN может перепутать языки";
      },
    },
    {
      name: "превью ссылок /ru и /kk — 200, картинка",
      requests: [{ path: "/ru/opengraph-image" }, { path: "/kk/twitter-image" }],
      verify: (rs) => {
        const bad = rs.find((r) => r.status !== 200 || !(r.headers["content-type"] ?? "").startsWith("image/png"));
        return bad ? `код ${bad.status}, тип «${bad.headers["content-type"] ?? ""}», ждём 200 image/png` : null;
      },
    },
    {
      // Адреса без языка, которые middleware пропускает в [locale] (API, копии картинок): не мягкая 404 с картинкой
      name: "превью ссылок с чужим языком — 404",
      requests: [{ path: "/api/opengraph-image" }, { path: "/_img/twitter-image" }],
      verify: (rs) => {
        const bad = rs.find((r) => r.status !== 404 || (r.headers["content-type"] ?? "").startsWith("image/"));
        return bad ? `код ${bad.status}, тип «${bad.headers["content-type"] ?? ""}», ждём 404 без картинки` : null;
      },
    },
    { name: "/api/health/ready — 200", requests: [{ path: "/api/health/ready" }], verify: ([r]) => (r.status === 200 ? null : `код ${r.status}`) },
  ];
}

/**
 * Разбор вывода `curl --include`: последний блок заголовков (после 100 Continue и т. п.) и тело.
 * @param {string} out
 * @returns {Res}
 */
export function parseCurlInclude(out) {
  let rest = out;
  let head = "";
  while (/^HTTP\/[\d.]+ \d{3}/.test(rest)) {
    const end = rest.search(/\r?\n\r?\n/);
    if (end < 0) {
      head = rest;
      rest = "";
      break;
    }
    head = rest.slice(0, end);
    rest = rest.slice(end).replace(/^\r?\n\r?\n/, "");
  }
  const [statusLine, ...lines] = head.split(/\r?\n/);
  const status = Number(statusLine?.match(/^HTTP\/[\d.]+ (\d{3})/)?.[1] ?? 0);
  /** @type {Record<string, string>} */
  const headers = {};
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { status, headers, body: rest };
}
