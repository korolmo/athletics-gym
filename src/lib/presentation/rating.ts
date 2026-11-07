import { plural } from "@/lib/plural";

/** «405 оценок в 2ГИС»: число оценок из Настроек сайта, слово в нужной форме — из словаря. */
export function ratingCountText(text: { count: string; words: readonly string[] }, count: number): string {
  return text.count.replace("{n}", String(count)).replace("{word}", plural(count, text.words));
}
