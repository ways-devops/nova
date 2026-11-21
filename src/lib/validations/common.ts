import { z } from "zod";
import { isValidRuPhone } from "@/lib/utils/phone";

/** Пустые строки из форм считаем отсутствующим значением. */
export const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const optText = (max = 500) =>
  z.preprocess(emptyToUndef, z.string().trim().max(max).optional());

export const optEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToUndef, z.enum(values).optional());

export const optInt = (max = 100_000_000) =>
  z.preprocess(
    emptyToUndef,
    z.coerce
      .number({ invalid_type_error: "Введите число" })
      .int("Нужно целое число")
      .min(0, "Не может быть отрицательным")
      .max(max)
      .optional(),
  );

export const PHONE_ERROR = "Телефон в формате +7(999)-999-99-99";

/** Необязательный телефон: если заполнен — должен быть полным (код +7 и 10 цифр). */
export const optPhone = z.preprocess(
  emptyToUndef,
  z.string().trim().refine(isValidRuPhone, PHONE_ERROR).optional(),
);

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const optDate = z.preprocess(
  emptyToUndef,
  z.string().regex(DATE_RE, "Неверная дата").optional(),
);

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Проверьте введённые данные";
}
