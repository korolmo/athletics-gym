// Повтор первого подключения к базе Лаборатории (этап 0, инцидент 3; этап 6, решение 1).
// Холодный кластер TiDB иногда отвечает на первое соединение дольше тайм-аута — «Can't reach database server».
// Повторяем только ошибки соединения: ошибка в SQL или в данных повтором не лечится и падает сразу.

/** Сколько всего попыток и пауза между ними. */
export const CONNECT_ATTEMPTS = 3;
export const CONNECT_RETRY_DELAY_MS = 3000;

// P1001 — сервер недоступен, P1002 — тайм-аут, P1017 — сервер закрыл соединение
const CONNECT_CODES = new Set(["P1001", "P1002", "P1017"]);
// Драйвер mariadb (Prisma 7): «connection timeout», «socket timeout», ER_CONNECTION_TIMEOUT, ER_GET_CONNECTION_TIMEOUT
const CONNECT_MESSAGE =
  /can't reach database server|timed out|connection (refused|reset|closed|timeout)|socket timeout|ER_(GET_)?CONNECTION_TIMEOUT|ECONNRESET|ECONNREFUSED|ETIMEDOUT/i;

/** Ошибка соединения с базой, а не запроса. */
export function isConnectError(error) {
  const code = error?.errorCode ?? error?.code;
  if (typeof code === "string" && CONNECT_CODES.has(code)) return true;
  return CONNECT_MESSAGE.test(String(error?.message ?? ""));
}

/** Адрес базы с паролем в лог не попадает. */
export function hideUrl(text) {
  return String(text).replace(/mysql:\/\/\S+/g, "<url>");
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Выполнить fn, при ошибке соединения — повторить (всего attempts раз, с паузой delayMs).
 * Любая другая ошибка и последняя неудачная попытка пробрасываются как есть.
 */
export async function withConnectRetry(fn, { attempts = CONNECT_ATTEMPTS, delayMs = CONNECT_RETRY_DELAY_MS, sleep = wait, log = console.warn } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= attempts || !isConnectError(error)) throw error;
      log(`Нет соединения с базой (попытка ${attempt} из ${attempts}): ${hideUrl(error?.message ?? error).split("\n")[0]} — повтор через ${delayMs / 1000} с`);
      await sleep(delayMs);
    }
  }
}
