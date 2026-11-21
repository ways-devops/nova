import { z } from "zod";
import {
  BUSINESS_TYPES,
  CONTRACT_STATUSES,
  SERVICES,
  TAX_SYSTEMS,
} from "@/lib/labels";
import { DATE_RE, emptyToUndef, optEnum, optPhone, optText } from "./common";

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя или организацию").max(200),
  inn: z.preprocess(
    emptyToUndef,
    z
      .string()
      .trim()
      .regex(/^(\d{10}|\d{12})$/, "ИНН: 10 или 12 цифр")
      .optional(),
  ),
  businessType: optEnum(BUSINESS_TYPES),
  taxSystem: optEnum(TAX_SYSTEMS),
  services: z.array(z.enum(SERVICES)),
  monthlyFee: z.coerce
    .number({ invalid_type_error: "Укажите ежемесячную стоимость" })
    .int("Нужно целое число")
    .min(0)
    .max(10_000_000),
  startDate: z.string().regex(DATE_RE, "Укажите дату начала обслуживания"),
  contractStatus: z.enum(CONTRACT_STATUSES),
  phone: optPhone,
  email: z.preprocess(
    emptyToUndef,
    z.string().trim().email("Некорректный email").optional(),
  ),
  contactPerson: optText(200),
  notes: optText(5000),
});

export type ClientInput = z.infer<typeof clientSchema>;
