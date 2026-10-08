// Разбор полей FormData — общий для всех форм админки

/** Текстовое поле без пробелов по краям; нет поля — пустая строка. */
export function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

/** Пустая строка → null, иначе число (возможно NaN — проверяет вызывающий). Пробелы внутри числа допустимы: «12 000». */
export function optionalInt(raw: string): number | null {
  const clean = raw.replace(/\s/g, "");
  return clean === "" ? null : Number(clean);
}

/** Чекбокс: отмечен ли. */
export function checked(fd: FormData, key: string): boolean {
  return fd.get(key) === "on";
}
