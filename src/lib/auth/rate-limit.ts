// Простое ограничение попыток входа в памяти процесса.
// Для одного пользователя и одного сервера этого достаточно.
// При горизонтальном масштабировании заменить на Redis/БД.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Entry = { count: number; resetAt: number };
const attempts = new Map<string, Entry>();

export function checkLoginAllowed(key: string): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function registerFailedLogin(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function resetLoginAttempts(key: string) {
  attempts.delete(key);
}
