// Маска ввода телефона: +7(999)-999-99-99. Чистые функции — без React.

/** До 10 цифр национального номера; ведущие 7/8 (код страны) отбрасываются. */
export function nationalDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("7") || d.startsWith("8")) d = d.slice(1);
  return d.slice(0, 10);
}

function build(d: string): string {
  let out = `+7(${d.slice(0, 3)}`;
  if (d.length > 3) out += `)-${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

/**
 * Применяет маску к тому, что ввёл пользователь.
 * prev — предыдущее значение: по нему понимаем, что идёт стирание,
 * и позволяем очистить поле полностью.
 */
export function maskPhone(raw: string, prev = ""): string {
  const d = nationalDigits(raw);
  if (d.length === 0) return raw.length < prev.length ? "" : "+7(";
  return build(d);
}
