// Модуль Записи (этап 1, ADR 0017): Записи Клиентов к Тренерам, лимит будущих Записей, отмена.
// Зависит от Клиентов (сессия, блокировка строки), Тренеров (кого можно записать) и Окон (свободно ли время);
// от него — никто, кроме слоя приложения. Снаружи — этот файл (сервер) и client.ts (браузер).
import "server-only";

export * from "./client";
export { parseBookingForm, type BookingInput } from "./validation/booking";
export {
  cancelBookingByOwner,
  cancelMyBooking,
  cancelMyFutureBookings,
  createBooking,
  listBookingsForOwner,
  listMyBookings,
  trainerBusy,
  type AdminBooking,
  type ClientBooking,
  type CreateResult,
  type CreatedBooking,
} from "./service/bookings";
