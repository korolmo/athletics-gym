import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { sniffImageType } from "../../src/lib/domain/photo";
import { photoWithVariants } from "./photo-variants";

describe("перенос Фото: уменьшенные копии", () => {
  const uuid = "3f2b8c1e-9a4d-4e7b-8c21-0a1b2c3d4e5f";

  it("JPEG 1112 px: само Фото как есть и копии 400 и 800 px по ширине, тоже JPEG", async () => {
    const bytes = new Uint8Array(fs.readFileSync("public/trainers/aisha.jpg"));
    const files = await photoWithVariants(`trainer/${uuid}.jpg`, bytes);
    expect(Object.keys(files)).toEqual([`trainer/${uuid}.jpg`, `trainer/${uuid}-w400.jpg`, `trainer/${uuid}-w800.jpg`]);
    expect(files[`trainer/${uuid}.jpg`]).toBe(bytes);
    expect((await sharp(files[`trainer/${uuid}-w400.jpg`]).metadata()).width).toBe(400);
    expect((await sharp(files[`trainer/${uuid}-w800.jpg`]).metadata()).width).toBe(800);
    expect(sniffImageType(files[`trainer/${uuid}-w800.jpg`])).toBe("image/jpeg");
  });

  it("WebP меньше 800 px не растягивается; копии — WebP", async () => {
    const small = new Uint8Array(await sharp("public/logo.png").resize({ width: 600 }).webp().toBuffer());
    const files = await photoWithVariants(`gallery/${uuid}.webp`, small);
    expect((await sharp(files[`gallery/${uuid}-w800.webp`]).metadata()).width).toBe(600);
    expect(sniffImageType(files[`gallery/${uuid}-w400.webp`])).toBe("image/webp");
  });
});
