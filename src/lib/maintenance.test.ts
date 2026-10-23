import { describe, expect, it } from "vitest";
import { isMaintenance } from "./maintenance";

describe("технические работы", () => {
  it("включаются только MAINTENANCE_MODE=1", () => {
    expect(isMaintenance({ MAINTENANCE_MODE: "1" })).toBe(true);
    expect(isMaintenance({ MAINTENANCE_MODE: " 1 " })).toBe(true);
    for (const value of [undefined, "", "0", "true", "yes"]) expect(isMaintenance({ MAINTENANCE_MODE: value })).toBe(false);
  });
});
