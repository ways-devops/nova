import { z } from "zod";
import { TASK_PRIORITIES } from "@/lib/labels";
import { emptyToUndef, optText } from "./common";

export const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Укажите название задачи").max(200),
  dueAt: z.string().regex(DATETIME_RE, "Укажите дату и время"),
  priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
  // "lead:<id>" или "client:<id>"
  link: z.preprocess(
    emptyToUndef,
    z
      .string()
      .regex(/^(lead|client):[A-Za-z0-9_-]+$/, "Неверная связь с клиентом")
      .optional(),
  ),
  description: optText(2000),
});
