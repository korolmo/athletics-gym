// Модуль Тарифы (этап 6, ADR 0015): Залы, Тарифы, Категории тарифа и место для Фото «Плакат прайса».
// Снаружи — только этот файл (сервер) и client.ts (браузер). Зависит от Фото (базовый модуль), не наоборот.
import "server-only";

export * from "./client";
export { parseTariffForm, tariffSchema, type TariffInput } from "./validation/tariff";
export {
  deleteTariff,
  getTariff,
  listHallTariffs,
  moveTrainerTariffs,
  saveTariff,
  toggleTariffVisibility,
  type TariffPlace,
  type TrainerHallLookup,
} from "./service/tariffs";
export { listPricePosters, pricePosterSlot } from "./service/price-poster";
export { listHallLogos, listPricePosterUrls, listVisibleHallTariffs } from "./service/public";
export { demoRestore as restoreTariffsDemo, demoSnapshot as snapshotTariffsDemo } from "./service/demo";
