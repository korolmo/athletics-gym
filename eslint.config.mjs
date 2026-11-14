import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Плоский конфиг ESLint (Next 16): eslint-config-next отдаёт готовые наборы правил, FlatCompat больше не нужен.
const config = [
  { ignores: [".next/**", "node_modules/**", "src/generated/**", "next-env.d.ts", "design/**", "public/**", "dist/**", "transfer-out/**"] },
  ...nextVitals,
  ...nextTs,
  // Файлы собранного приложения для хостинга (start.cjs, migrate.cjs) — CommonJS: их запускает Node без сборки
  { files: ["**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
];

export default config;
