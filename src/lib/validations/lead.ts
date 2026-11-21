import { z } from "zod";
import {
  BUSINESS_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  SERVICES,
  TAX_SYSTEMS,
} from "@/lib/labels";
import { optDate, optEnum, optInt, optPhone, optText } from "./common";

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя клиента").max(200),
  phone: optPhone,
  company: optText(200),
  businessType: optEnum(BUSINESS_TYPES),
  city: optText(100),
  source: z.enum(LEAD_SOURCES).default("OTHER"),
  service: optEnum(SERVICES),
  budget: optInt(),
  comment: optText(5000),
  receivedAt: optDate,
});

export type LeadInput = z.infer<typeof leadSchema>;

export const statusSchema = z.enum(LEAD_STATUSES);

export const lostSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(2, "Укажите причину потери клиента")
    .max(500, "Слишком длинная причина"),
});

export const winSchema = z.object({
  monthlyFee: z.coerce
    .number({ invalid_type_error: "Укажите стоимость обслуживания" })
    .int("Нужно целое число")
    .min(1, "Укажите стоимость обслуживания в месяц")
    .max(10_000_000),
  startDate: optDate,
  taxSystem: optEnum(TAX_SYSTEMS),
});

export const noteSchema = z.object({
  text: z.string().trim().min(1, "Введите текст заметки").max(5000),
});
