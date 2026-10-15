export class StorageNotConfigured extends Error {
  constructor(detail: string) {
    super(`Хранилище фото не настроено: ${detail}`);
  }
}

/** Файл с таким путём уже есть: имена уникальные, перезаписывать нельзя. */
export class MediaFileExists extends Error {
  constructor(path: string) {
    super(`Файл уже есть: ${path}`);
  }
}
