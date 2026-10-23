import Head from "next/head";
import { OFFLINE_CSS, offlineBody } from "@/lib/errors/offline-page";

// Страница 500 для статических страниц сайта (/ru, /kk, документы). Они собираются при первом запросе и лежат в кэше;
// если сборка упала (не ответила база), app/[locale]/error.tsx Next не показывает — отдаёт pages/500 из Pages Router.
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
