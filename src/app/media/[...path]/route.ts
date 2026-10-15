import { basePhotoPath, typeOfPath } from "@/lib/domain/photo";
import { disk, storageDriver } from "@/lib/storage/client";

// Раздача Фото с диска хостинга (STORAGE_DRIVER=local, ADR 0004). Имена файлов уникальные и не меняются,
// поэтому браузер хранит их год. Отдаём только файлы по правилу имён Фото — никаких других путей.

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
  if (storageDriver() !== "local") return notFound();
  const rel = (await params).path.join("/");
  const type = typeOfPath(rel);
  if (basePhotoPath(rel) === null || !type) return notFound();

  const file = await disk.open(rel);
  if (!file) return notFound();
  return new Response(file.body, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(file.size),
      "Last-Modified": file.mtime.toUTCString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
