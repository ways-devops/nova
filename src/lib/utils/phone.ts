/** 10 цифр национального номера из любой записи (+7…, 8…, 7…, без кода) или null. */
export function phoneNationalDigits(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
    return digits.slice(1);
  }
  if (digits.length === 10) return digits;
  return null;
}

/** Полный российский номер: код страны + 10 цифр. */
export function isValidRuPhone(raw: string): boolean {
  return phoneNationalDigits(raw) !== null;
}

/** Приводит номер к хранимому виду +7XXXXXXXXXX; нераспознанное оставляет как есть. */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const national = phoneNationalDigits(trimmed);
  return national ? `+7${national}` : trimmed;
}

/** +79991234567 → +7(999)-123-45-67 */
export function formatPhone(phone?: string | null): string {
  if (!phone) return "";
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+7(${m[1]})-${m[2]}-${m[3]}-${m[4]}` : phone;
}

/** Цифры для поиска по подстроке в сохранённом номере (+7…). */
export function phoneSearchDigits(query: string): string | null {
  let digits = query.replace(/\D/g, "");
  if (digits.length < 4) return null;
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  return digits;
}
