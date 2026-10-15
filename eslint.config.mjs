import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "design/**", "public/**", "dist/**", "transfer-out/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Файлы собранного приложения для хостинга (start.cjs, migrate.cjs) — CommonJS: их запускает Node без сборки
  { files: ["**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
];

export default config;
