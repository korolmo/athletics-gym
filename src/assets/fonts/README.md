# Шрифты для картинки-превью ссылок

Onest (ExtraBold и Medium) — для `src/app/[locale]/opengraph-image.tsx`: `next/og` рисует картинку на сервере и шрифты сайта из `next/font` взять не может. В файлах тот же набор знаков, что у шрифта сайта (`site/README.md`): кириллица, все казахские буквы и ₸.

Собраны из `Onest[wght].ttf` (github.com/google/fonts, `ofl/onest`): `fonttools varLib.instancer` с `wght=800` и `wght=500`, затем `pyftsubset` со списком знаков из `site/README.md` (без `--flavor` — нужен ttf).

Лицензия — SIL Open Font License 1.1.
