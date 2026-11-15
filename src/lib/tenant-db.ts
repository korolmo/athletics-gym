import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

// Клиент базы Клуба (этап П2, ADR 0020, решения 2 и 20). Расширение Prisma добавляет `clubId` Клуба в условие
// каждой операции модели Клуба и в каждую новую строку — сервисы не пишут его сами и не могут забыть.
// Чего расширение не видит (и что должен сделать сервис):
//   - вложенные записи (`trainer: { create: { workHours: { create: […] } } }`) — дочерней строке `clubId` явно;
//   - сырой SQL — только из списка исключений (tenant-db.test.ts), с условием по Клубу.
// Таблица Club и общая LoginAttempt не трогаются: у них нет `clubId`.

type Args = Record<string, unknown>;

/** Модели Клуба (есть поле `clubId`) и их поля-связи — из схемы Prisma, а не списком в коде. */
const CLUB_MODELS: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === "clubId"))
    .map((m) => [m.name, new Set(m.fields.filter((f) => f.kind === "object").map((f) => f.name))]),
);

/** Модель относится к Клубу — `dbFor` добавляет ей `clubId`. */
export function isClubModel(model: string): boolean {
  return CLUB_MODELS.has(model);
}

const WHERE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

function withWhere(args: Args, clubId: string): Args {
  const where = (args.where as Args | undefined) ?? {};
  if ("clubId" in where && where.clubId !== clubId) throw new Error(`dbFor(${clubId}): условие по чужому Клубу (${String(where.clubId)})`);
  return { ...args, where: { ...where, clubId } };
}

/**
 * Новая строка — в Клубе. Если в данных есть запись связи (`hall: { connect }`), Prisma не примет рядом скаляр
 * `clubId` — тогда Клуб тоже связью.
 */
function withClub(model: string, data: unknown, clubId: string): Args {
  const row = (data ?? {}) as Args;
  const relations = CLUB_MODELS.get(model)!;
  const own = row.clubId ?? (row.club as { connect?: { id?: unknown } } | undefined)?.connect?.id;
  if (own !== undefined && own !== clubId) throw new Error(`dbFor(${clubId}): строка ${model} чужого Клуба (${String(own)})`);
  const rest = { ...row };
  delete rest.clubId;
  delete rest.club;
  const checked = Object.keys(rest).some((k) => relations.has(k));
  return checked ? { ...rest, club: { connect: { id: clubId } } } : { ...rest, clubId };
}

/** Аргументы операции `operation` модели `model` в пределах Клуба `clubId`. Чистая функция — её и проверяют тесты. */
export function scopeArgs(model: string, operation: string, args: Args | undefined, clubId: string): Args {
  const a: Args = args ?? {};
  if (!isClubModel(model)) return a;
  if (WHERE_OPS.has(operation)) return withWhere(a, clubId);
  switch (operation) {
    case "create":
      return { ...a, data: withClub(model, a.data, clubId) };
    case "createMany":
    case "createManyAndReturn": {
      const rows = Array.isArray(a.data) ? a.data : [a.data];
      return { ...a, data: rows.map((r) => withClub(model, r, clubId)) };
    }
    case "upsert":
      return { ...withWhere(a, clubId), create: withClub(model, a.create, clubId) };
    default:
      throw new Error(`dbFor: операция ${model}.${operation} не поддержана — добавьте её в tenant-db.ts`);
  }
}

/** Клиент Prisma, который видит и пишет только строки Клуба `clubId`. Для тестов на MariaDB — со своим клиентом. */
export function scopeToClub(client: PrismaClient, clubId: string) {
  return client.$extends({
    name: `club:${clubId}`,
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          return query(scopeArgs(model, operation, args as Args, clubId) as typeof args);
        },
      },
    },
  });
}

export type ClubDb = ReturnType<typeof scopeToClub>;

const clients = new Map<string, ClubDb>();

/** Клиент базы Клуба `clubId` — единственный путь сервисов к таблицам Клуба (решение 19). */
export function dbFor(clubId: string): ClubDb {
  if (!clubId) throw new Error("dbFor: пустой id Клуба");
  let client = clients.get(clubId);
  if (!client) {
    client = scopeToClub(db, clubId);
    clients.set(clubId, client);
  }
  return client;
}
