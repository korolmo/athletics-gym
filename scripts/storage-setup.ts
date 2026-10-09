// Создаёт (или приводит в порядок) бакет для Фото в Supabase Storage.
// Запуск: npm run storage:setup (база разработки, .env) или npm run storage:setup:prod (боевая, .env.preview).
// Повторный запуск безопасен: файлы в бакете не трогает, только сверяет настройки.

import { createClient } from "@supabase/supabase-js";
import { ALLOWED_TYPES, MAX_FILE_BYTES, MEDIA_BUCKET } from "../src/lib/domain/photo";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Не заданы SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в файле окружения.");
    process.exitCode = 1;
    return;
  }

  // Хранилище и база должны быть одного проекта: иначе пути в базе укажут на файлы из чужого бакета
  const ref = new URL(url).hostname.split(".")[0];
  const database = process.env.DATABASE_URL ?? "";
  if (!database.includes(`postgres.${ref}`) && !database.includes(`db.${ref}.`)) {
    console.error(`Отказ: SUPABASE_URL (проект ${ref}) и DATABASE_URL указывают на разные проекты Supabase.`);
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Публичный: файлы читаются по прямой ссылке. Запись — только по подписанной ссылке или ключом service_role.
  const options = { public: true, fileSizeLimit: MAX_FILE_BYTES, allowedMimeTypes: [...ALLOWED_TYPES] };

  const { data: existing } = await supabase.storage.getBucket(MEDIA_BUCKET);
  const { error } = existing
    ? await supabase.storage.updateBucket(MEDIA_BUCKET, options)
    : await supabase.storage.createBucket(MEDIA_BUCKET, options);
  if (error) {
    console.error(`Не удалось ${existing ? "обновить" : "создать"} бакет «${MEDIA_BUCKET}»:`, error.message);
    process.exitCode = 1;
    return;
  }

  const { data: bucket } = await supabase.storage.getBucket(MEDIA_BUCKET);
  console.log(
    `Проект ${ref}: бакет «${MEDIA_BUCKET}» ${existing ? "уже был, настройки сверены" : "создан"}. ` +
      `Публичный: ${bucket?.public ? "да" : "нет"}; размер файла до ${bucket?.file_size_limit} байт; типы: ${bucket?.allowed_mime_types?.join(", ")}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
