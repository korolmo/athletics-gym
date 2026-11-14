import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateTotpSecret, hotp, otpauthUri, timeStep, totp, verifyTotp } from "./totp";
import { decryptSecret, encryptSecret, generateRecoveryCodes, normalizeRecoveryCode, totpKey } from "./totp-secret";

// Векторы из стандартов: RFC 4226, приложение D, и RFC 6238, приложение B.
const SECRET_SHA1 = Buffer.from("12345678901234567890");
const SECRET_SHA256 = Buffer.from("12345678901234567890123456789012");
const SECRET_SHA512 = Buffer.from("1234567890123456789012345678901234567890123456789012345678901234");

describe("HOTP — RFC 4226, приложение D", () => {
  it("счётчики 0–9", () => {
    const expected = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"];
    expect(expected.map((_, i) => hotp(SECRET_SHA1, i))).toEqual(expected);
  });
});

describe("TOTP — RFC 6238, приложение B (8 цифр, шаг 30 с)", () => {
  const cases: [number, string, string, string][] = [
    [59, "94287082", "46119246", "90693936"],
    [1111111109, "07081804", "68084774", "25091201"],
    [1111111111, "14050471", "67062674", "99943326"],
    [1234567890, "89005924", "91819424", "93441116"],
    [2000000000, "69279037", "90698825", "38618901"],
    [20000000000, "65353130", "77737706", "47863826"],
  ];
  it.each(cases)("T = %i", (t, sha1, sha256, sha512) => {
    const ms = t * 1000;
    expect(totp(SECRET_SHA1, ms, { digits: 8, algorithm: "sha1" })).toBe(sha1);
    expect(totp(SECRET_SHA256, ms, { digits: 8, algorithm: "sha256" })).toBe(sha256);
    expect(totp(SECRET_SHA512, ms, { digits: 8, algorithm: "sha512" })).toBe(sha512);
  });
});

describe("base32 — RFC 4648", () => {
  it("векторы стандарта (без «=»)", () => {
    const v: [string, string][] = [["", ""], ["f", "MY"], ["fo", "MZXQ"], ["foo", "MZXW6"], ["foob", "MZXW6YQ"], ["fooba", "MZXW6YTB"], ["foobar", "MZXW6YTBOI"]];
    for (const [plain, enc] of v) {
      expect(base32Encode(Buffer.from(plain))).toBe(enc);
      expect(base32Decode(enc)?.toString()).toBe(plain);
    }
  });
  it("ввод руками: регистр, пробелы, дефисы, «=» не важны; чужой знак — null", () => {
    expect(base32Decode("mzxw 6ytb-oi==")?.toString()).toBe("foobar");
    expect(base32Decode("MZXW1")).toBeNull();
  });
  it("секрет — 20 байт, 32 знака, каждый раз новый", () => {
    const a = generateTotpSecret();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(a)).toHaveLength(20);
    expect(generateTotpSecret()).not.toBe(a);
  });
});

describe("проверка кода", () => {
  const now = 1_763_000_000_000;
  const code = (offsetSteps: number) => hotp(SECRET_SHA1, timeStep(now) + offsetSteps);

  it("текущий код и соседние шаги (±30 с часов телефона) — принимаются; дальше — нет", () => {
    expect(verifyTotp(SECRET_SHA1, code(0), now)).toBe(timeStep(now));
    expect(verifyTotp(SECRET_SHA1, code(-1), now)).toBe(timeStep(now) - 1);
    expect(verifyTotp(SECRET_SHA1, code(1), now)).toBe(timeStep(now) + 1);
    expect(verifyTotp(SECRET_SHA1, code(-2), now)).toBeNull();
    expect(verifyTotp(SECRET_SHA1, code(2), now)).toBeNull();
  });

  it("уже принятый шаг повторно не проходит (повтор того же кода)", () => {
    const step = verifyTotp(SECRET_SHA1, code(0), now)!;
    expect(verifyTotp(SECRET_SHA1, code(0), now, { afterStep: step })).toBeNull();
    expect(verifyTotp(SECRET_SHA1, code(-1), now, { afterStep: step })).toBeNull();
    expect(verifyTotp(SECRET_SHA1, code(1), now, { afterStep: step })).toBe(step + 1);
  });

  it("не шесть цифр — сразу нет; пробелы внутри кода не мешают", () => {
    expect(verifyTotp(SECRET_SHA1, "12345", now)).toBeNull();
    expect(verifyTotp(SECRET_SHA1, "abcdef", now)).toBeNull();
    const c = code(0);
    expect(verifyTotp(SECRET_SHA1, `${c.slice(0, 3)} ${c.slice(3)}`, now)).toBe(timeStep(now));
  });

  it("ссылка otpauth: издатель — Клуб, параметры по умолчанию приложений", () => {
    const uri = otpauthUri("JBSWY3DPEHPK3PXP", "owner", "Athletic's Gym");
    expect(uri.startsWith("otpauth://totp/Athletic's%20Gym%3Aowner?")).toBe(true);
    const q = new URL(uri.replace("otpauth://", "https://x/")).searchParams;
    expect(Object.fromEntries(q)).toEqual({ secret: "JBSWY3DPEHPK3PXP", issuer: "Athletic's Gym", algorithm: "SHA1", digits: "6", period: "30" });
  });
});

describe("хранение второго фактора", () => {
  const key = totpKey(Buffer.alloc(32, 7).toString("base64"))!;

  it("ключ — ровно 32 байта в base64; иначе 2FA выключена", () => {
    expect(key).toHaveLength(32);
    expect(totpKey(undefined)).toBeNull();
    expect(totpKey(Buffer.alloc(16).toString("base64"))).toBeNull();
  });

  it("шифрование AES-256-GCM: туда и обратно, каждый раз другой шифротекст, секрета в нём не видно", () => {
    const a = encryptSecret("JBSWY3DPEHPK3PXP", key);
    const b = encryptSecret("JBSWY3DPEHPK3PXP", key);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^v1\./);
    expect(a).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(a, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("другой ключ, подделка или чужой формат — null", () => {
    const enc = encryptSecret("JBSWY3DPEHPK3PXP", key);
    expect(decryptSecret(enc, totpKey(Buffer.alloc(32, 8).toString("base64"))!)).toBeNull();
    const [v, iv, tag, ct] = enc.split(".");
    const flipped = Buffer.from(ct, "base64url");
    flipped[0] ^= 1;
    expect(decryptSecret([v, iv, tag, flipped.toString("base64url")].join("."), key)).toBeNull();
    expect(decryptSecret("JBSWY3DPEHPK3PXP", key)).toBeNull();
  });

  it("10 разных кодов восстановления «XXXX-XXXX» без похожих знаков 0, O, 1, I, L", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });

  it("ввод кода восстановления: регистр, дефис и пробелы не важны", () => {
    expect(normalizeRecoveryCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(normalizeRecoveryCode("ABCD EFGH")).toBe("ABCDEFGH");
    expect(normalizeRecoveryCode("ABC-EFGH")).toBeNull();
  });
});
