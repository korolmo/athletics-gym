// Модуль Главная (этап 6, ADR 0015): собирает данные публичной главной из модулей. Модуль поверх остальных —
// его не импортирует ни один модуль; своих таблиц нет.
import "server-only";

export { getPriceListAndTrainers, getSitePhotos } from "./service/home-data";
