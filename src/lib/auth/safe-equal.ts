import { createHash, timingSafeEqual } from "node:crypto";

/** Сравнение секретов за постоянное время (через хеши одинаковой длины). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
