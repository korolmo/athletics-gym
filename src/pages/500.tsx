import Head from "next/head";
import { OFFLINE_CSS, offlineBody } from "@/lib/errors/offline-page";

// Страница 500 для статических страниц сайта (/ru, /kk, документы). Они собираются при первом запросе и лежат в кэше;
// если сборка упала (не ответила база), Next отдаёт pages/500 из Pages Router — с кодом 500 и мимо кэша: следующий
// запрос собирает страницу заново. Своей error.tsx у сайта нет намеренно (ADR 0013): её Next положил бы в кэш как
// обычную страницу с кодом 200, и до часа вместо главной висела бы «Ошибка 500».
// Собирается при сборке, без базы: та же двуязычная страница, что у веб-сервера (src/lib/errors/offline-page.ts), с кодом 500.

export default function ServerErrorPage() {
  return (
    <>
      <Head>
        <title>Athletic&apos;s Gym</title>
        <meta name="robots" content="noindex" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: OFFLINE_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: offlineBody(500) }} />
    </>
  );
}
