import { isAuthed } from "@/lib/auth";
import { MAX_FILE_BYTES, basePhotoPath, checkQuota, formatMegabytes, sniffImageType, typeOfPath } from "@/lib/domain/photo";
import { MediaFileExists, StorageNotConfigured, disk, storageDriver } from "@/lib/storage/client";
import { logError } from "@/lib/observability/log";

// Приём загруженного Фото на диск хостинга (STORAGE_DRIVER=local, ADR 0004): один файл на запрос (PUT).
// Путь выдаёт сервер в requestUpload (services/photos); здесь — только Владелец, только путь по правилу имён,
// до 5 МБ, тип — по содержимому файла и совпадает с расширением, в пределах лимита объёма, без перезаписи.

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/** Тело запроса не больше limit байт; больше — null, дальше не читаем. */
async function readLimited(request: Request, limit: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/** Запрос с нашей же страницы: чужой сайт не может отправить файл от имени Владельца. */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
  if (storageDriver() !== "local") return fail(404, "Загрузка на диск выключена.");
  if (!sameOrigin(request)) return fail(403, "Запрос не со страницы админки.");
  if (!(await isAuthed())) return fail(401, "Сессия закончилась. Войдите в админку заново.");

  const rel = (await params).path.join("/");
  const expected = typeOfPath(rel);
  if (basePhotoPath(rel) === null || !expected) return fail(400, "Неверный путь файла. Обновите страницу и загрузите фото снова.");

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_FILE_BYTES) {
    return fail(413, `Фото слишком большое: ${formatMegabytes(declared)}. Можно не больше ${formatMegabytes(MAX_FILE_BYTES)}.`);
  }
  const bytes = await readLimited(request, MAX_FILE_BYTES);
  if (!bytes) return fail(413, `Фото слишком большое. Можно не больше ${formatMegabytes(MAX_FILE_BYTES)}.`);
  if (bytes.byteLength === 0) return fail(400, "Файл пустой — выберите другое фото.");
  if (sniffImageType(bytes) !== expected) return fail(415, "Это не фото: подходят только картинки JPEG, PNG и WebP.");

  try {
    const space = checkQuota(await disk.usedBytes(), bytes.byteLength, disk.quotaBytes());
    if (!space.ok) return fail(507, space.error);
    await disk.write(rel, bytes);
  } catch (e) {
    if (e instanceof MediaFileExists) return fail(409, "Такой файл уже загружен. Обновите страницу.");
    if (e instanceof StorageNotConfigured) {
      logError("Хранилище фото: ошибка.", e);
      return fail(500, "Хранилище фото не настроено. Сообщите разработчику.");
    }
    logError("Хранилище фото: файл не записан.", e);
    return fail(500, "Фото не сохранилось на сервере. Попробуйте ещё раз.");
  }
  return new Response(null, { status: 201 });
}
