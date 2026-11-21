export function formatRub(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}
