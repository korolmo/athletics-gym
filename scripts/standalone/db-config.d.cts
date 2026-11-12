// Типы для db-config.cjs (его берут TypeScript-файлы приложения и скриптов).
import type { PoolConfig } from "mariadb";

export const LOCAL_HOSTS: Set<string>;
export function mariadbConfig(raw: string | undefined, override?: { connectionLimit?: number }): PoolConfig;
export type RawDb = {
  $queryRawUnsafe<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]>;
  $executeRawUnsafe(sql: string, ...params: unknown[]): Promise<number>;
  $disconnect(): Promise<void>;
};
export function openSingleConnection(raw: string | undefined): Promise<RawDb>;
