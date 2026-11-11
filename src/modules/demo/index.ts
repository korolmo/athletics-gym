// Модуль Демо (этап П1, ADR 0019): суточный сброс демо-админки Лаборатории. Модуль поверх остальных, как Главная:
// берёт у модулей их снимок и возврат; его самого не импортирует ни один модуль. Своя таблица — DemoState.
import "server-only";

export * from "./domain/reset";
export { getDemoStatus, runDailyDemoReset, takeDemoSnapshot, type DemoStatus, type ResetResult } from "./service/reset";
