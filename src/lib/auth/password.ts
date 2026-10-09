import bcrypt from "bcryptjs";
import { PASSWORD_MAX_BYTES, passwordBytes } from "./password-policy";

// Хэш пароля Владельца — bcrypt (bcryptjs: чистый JS, без сборки под платформу).

const COST = 12;

export async function hashPassword(password: string, cost: number = COST): Promise<string> {
  return bcrypt.hash(password, cost);
}

/** Пароль длиннее предела bcrypt не подходит никогда — иначе совпал бы любой с тем же началом. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (passwordBytes(password) > PASSWORD_MAX_BYTES) return false;
  return bcrypt.compare(password, hash);
}
