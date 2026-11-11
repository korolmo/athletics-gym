import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Решение 9 этапа П1 (ADR 0019): действия, закрытые Гостю демо-админки, начинаются с requireRealOwner. Остальные
// действия админки — с requireOwner: Гость их может. Новое опасное действие — добавить сюда.

const LOCKED: Record<string, string[]> = {
  "(protected)/account/actions.ts": ["changePassword", "logoutEverywhere"],
  "(protected)/bookings/actions.ts": ["cancelBookingByOwnerAction"],
  "(protected)/directions/actions.ts": ["deleteDirection"],
  "(protected)/notifications/actions.ts": ["retryEventAction", "resolveEventAction"],
  "(protected)/photos/actions.ts": ["requestUpload", "attachPhoto", "discardUpload", "removePhoto", "deleteGalleryPhoto"],
  "(protected)/reviews/actions.ts": ["saveReview", "deleteReview"],
  "(protected)/tariffs/actions.ts": ["deleteTariff"],
  "(protected)/trainers/actions.ts": ["deleteTrainer"],
  "(protected)/trainers/schedule-actions.ts": ["saveWorkWeekAction", "addTimeOffAction", "deleteTimeOffAction"],
};

const dir = path.dirname(fileURLToPath(import.meta.url));
const body = (src: string, fn: string) => {
  const i = src.indexOf(`export async function ${fn}(`);
  const next = src.indexOf("export async function", i + 1);
  return i < 0 ? "" : src.slice(i, next < 0 ? undefined : next);
};

describe("Гостю демо-админки закрыто", () => {
  for (const [file, fns] of Object.entries(LOCKED)) {
    const src = fs.readFileSync(path.join(dir, file), "utf8").replace(/\r\n/g, "\n");
    for (const fn of fns) {
      it(`${file}: ${fn} — только Владелец`, () => {
        expect(body(src, fn), fn).toMatch(/^export async function [^\n]*\{\n\s*await requireRealOwner\(\);/);
      });
    }
  }

  it("Реквизиты — только Владелец", () => {
    const src = fs.readFileSync(path.join(dir, "(protected)/site/actions.ts"), "utf8");
    expect(body(src, "saveLegal")).toContain("requireRealOwner");
  });

  it("загрузка файла Фото — только Владелец (маршрут PUT)", () => {
    const src = fs.readFileSync(path.join(dir, "../api/admin/media/[...path]/route.ts"), "utf8");
    expect(src).toMatch(/role !== "owner"\) return fail\(403/);
  });
});
