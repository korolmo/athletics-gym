import crypto from "node:crypto";

// Метка времени формы «Оставить отзыв»: сервер ставит её при выдаче страницы и подписывает.
// По ней при отправке видно, сколько прошло с открытия страницы; подделать или сдвинуть время, не зная секрета, нельзя.

function sign(issuedAt: number, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`review-form.${issuedAt}`).digest("hex");
}

export function issueFormToken(secret: string | undefined, now: number = Date.now()): string {
  return `${now}.${sign(now, secret ?? "")}`;
}

/** Сколько миллисекунд прошло с выдачи формы; null — метки нет, она подделана или из будущего. */
export function readFormToken(token: string, secret: string | undefined, now: number = Date.now()): number | null {
  const match = /^(\d{10,16})\.([0-9a-f]{64})$/.exec(token);
  if (!match) return null;
  const issuedAt = Number(match[1]);
  const expected = Buffer.from(sign(issuedAt, secret ?? ""), "hex");
  const given = Buffer.from(match[2], "hex");
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  const elapsed = now - issuedAt;
  return elapsed >= 0 ? elapsed : null;
}
