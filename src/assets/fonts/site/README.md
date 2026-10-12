# Шрифты публичного сайта

- `manrope-400-800.woff2` — Manrope, переменный, начертания 400–800: весь текст сайта.
- `oswald-600.woff2` — Oswald 600: бегущая строка.

Каждое семейство — одним файлом и только с теми знаками, которые нужны сайту: латиница без диакритики, русский алфавит,
казахские, украинские и белорусские буквы, знаки препинания, №, стрелки. Буква, которой в файле нет (например, é),
рисуется системным шрифтом — тогда добавить её в список и пересобрать. Подключаются в `src/lib/fonts.ts` через `next/font/local`.

В Manrope нет букв Қ Ғ Ұ Ә Ң и знака ₸ (нет их и в версии Google Fonts) — браузер рисует их системным шрифтом.

Собраны из исходников Google Fonts (github.com/google/fonts, `ofl/manrope`, `ofl/oswald`) пакетом fonttools:

```
fonttools varLib.instancer "Manrope[wght].ttf" wght=400:800 -o Manrope-v.ttf
pyftsubset Manrope-v.ttf --unicodes="<список>" --layout-features="*" --flavor=woff2 --output-file=manrope-400-800.woff2
fonttools varLib.instancer "Oswald[wght].ttf" wght=600 -o Oswald-600.ttf
pyftsubset Oswald-600.ttf --unicodes="<список>" --layout-features="*" --flavor=woff2 --output-file=oswald-600.woff2
```

Список знаков: `U+0020-007E,U+00A0,U+00A7,U+00A9,U+00AB,U+00AE,U+00B0,U+00B1,U+00B7,U+00BB,U+00D7,U+00F7,U+0401,U+0404,U+0406,U+0407,U+040E,U+0410-044F,U+0451,U+0454,U+0456,U+0457,U+045E,U+0490-0493,U+049A-049B,U+04A2-04A3,U+04AE-04B1,U+04BA-04BB,U+04D8-04D9,U+04E8-04E9,U+2010-2015,U+2018-201E,U+2020-2022,U+2026,U+2030,U+2039-203A,U+20AC,U+20B8,U+20BD,U+2116,U+2122,U+2190-2193,U+2212`.

Лицензия — SIL Open Font License 1.1.
