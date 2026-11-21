const TZ = "Europe/Moscow";

export function formatDate(d: Date | string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));
}

export function formatDateTime(d: Date | string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

/** Значение для <input type="date"> в формате YYYY-MM-DD. */
export function toInputDate(d: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date(d));
}

/** YYYY-MM-DD из формы → Date (полдень по Москве, чтобы день не «съезжал»). */
export function parseInputDate(s: string): Date {
  return new Date(`${s}T12:00:00+03:00`);
}

/** Значение для <input type="datetime-local">: YYYY-MM-DDTHH:mm (Москва). */
export function toInputDateTime(d: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(d))
    .replace(" ", "T");
}

/** YYYY-MM-DDTHH:mm из формы → Date (время по Москве). */
export function parseInputDateTime(s: string): Date {
  return new Date(`${s}:00+03:00`);
}

/** «2026-11» — ключ месяца для группировки. */
export function monthKey(d: Date | string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  }).format(new Date(d));
}

const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

/** «2026-11» → «ноя» */
export function monthShort(key: string): string {
  const m = Number(key.slice(5, 7));
  return MONTHS_SHORT[m - 1] ?? key;
}

/** Ключи последних n месяцев, от старого к новому (включая текущий). */
export function lastMonthKeys(n: number, now: Date = new Date()): string[] {
  const [y, m] = monthKey(now).split("-").map(Number);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const total = y * 12 + (m - 1) - i;
    const yy = Math.floor(total / 12);
    const mm = (total % 12) + 1;
    keys.push(`${yy}-${String(mm).padStart(2, "0")}`);
  }
  return keys;
}
