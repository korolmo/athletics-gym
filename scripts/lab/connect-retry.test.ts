import { describe, expect, it, vi } from "vitest";
import { hideUrl, isConnectError, withConnectRetry } from "./connect-retry.mjs";

const noSleep = () => Promise.resolve();
const unreachable = () => Object.assign(new Error("Can't reach database server at `gateway01.eu-central-1.prod.aws.tidbcloud.com:4000`"), { errorCode: "P1001" });

describe("ошибка соединения", () => {
  it.each([
    [{ errorCode: "P1001", message: "" }],
    [{ errorCode: "P1002", message: "" }],
    [{ code: "P1017", message: "" }],
    [new Error("Can't reach database server at host:4000")],
    [new Error("connect ETIMEDOUT 1.2.3.4:4000")],
  ])("%o — повторяем", (e) => {
    expect(isConnectError(e)).toBe(true);
  });

  it.each([
    [{ code: "P2002", message: "Unique constraint failed" }],
    [new Error("Table 'pr_1.Tariff' doesn't exist")],
    [null],
  ])("%o — не повторяем", (e) => {
    expect(isConnectError(e)).toBe(false);
  });
});

describe("повтор подключения", () => {
  it("удача с первой попытки — без пауз и сообщений", async () => {
    const log = vi.fn();
    await expect(withConnectRetry(async () => 42, { sleep: noSleep, log })).resolves.toBe(42);
    expect(log).not.toHaveBeenCalled();
  });

  it("холодный TiDB: первая попытка не дошла, вторая успешна", async () => {
    const fn = vi.fn().mockRejectedValueOnce(unreachable()).mockResolvedValueOnce("ok");
    const sleep = vi.fn(noSleep);
    const log = vi.fn();
    await expect(withConnectRetry(fn, { sleep, log, delayMs: 3000 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(3000);
    expect(log.mock.calls[0][0]).toMatch(/попытка 1 из 3/);
  });

  it("все попытки неудачны — последняя ошибка наружу", async () => {
    const fn = vi.fn().mockRejectedValue(unreachable());
    await expect(withConnectRetry(fn, { attempts: 3, sleep: noSleep, log: () => {} })).rejects.toThrow(/Can't reach/);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("ошибка запроса не повторяется", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    await expect(withConnectRetry(fn, { sleep: noSleep, log: () => {} })).rejects.toThrow(/Unique/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("адрес базы с паролем в лог не попадает", async () => {
    const log = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(new Error("Can't reach database server mysql://user:secret@host:4000/pr_1")).mockResolvedValueOnce(1);
    await withConnectRetry(fn, { sleep: noSleep, log });
    expect(log.mock.calls[0][0]).not.toMatch(/secret/);
    expect(hideUrl("x mysql://u:p@h/db y")).toBe("x <url> y");
  });
});
