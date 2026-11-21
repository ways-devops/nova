"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/features/activity/log";
import { clientSchema } from "@/lib/validations/client";
import { firstError } from "@/lib/validations/common";
import { normalizePhone } from "@/lib/utils/phone";
import { parseInputDate } from "@/lib/utils/date";
import type { ActionResult, FormState } from "@/features/leads/types";

export async function updateClientAction(
  clientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = clientSchema.safeParse({
    ...Object.fromEntries(formData),
    services: formData.getAll("services"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const existing = await prisma.client.findUnique({ where: { id: clientId } });
  if (!existing) return { error: "Клиент не найден" };

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: d.name,
      inn: d.inn ?? null,
      businessType: d.businessType ?? null,
      taxSystem: d.taxSystem ?? null,
      services: d.services,
      monthlyFee: d.monthlyFee,
      startDate: parseInputDate(d.startDate),
      contractStatus: d.contractStatus,
      phone: normalizePhone(d.phone),
      email: d.email ?? null,
      contactPerson: d.contactPerson ?? null,
      notes: d.notes ?? null,
    },
  });
  await logActivity(prisma, {
    userId: user.id,
    clientId,
    leadId: existing.leadId ?? undefined,
    type: "NOTE",
    message: "Данные клиента обновлены",
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { saved: true };
}

/**
 * Удаляет клиента вместе с его задачами и сделками. Исходная заявка
 * не удаляется: она возвращается в воронку на этап «Переговоры».
 */
export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  const user = await requireUser();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({ where: { clientId } });
    await tx.deal.deleteMany({ where: { clientId } });
    // История: записи только клиента удаляем, общие с заявкой отвязываем от клиента
    await tx.activity.deleteMany({ where: { clientId, leadId: null } });
    await tx.activity.updateMany({ where: { clientId }, data: { clientId: null } });
    await tx.client.delete({ where: { id: clientId } });

    if (client.leadId) {
      await tx.lead.update({
        where: { id: client.leadId },
        data: { status: "NEGOTIATION" },
      });
      await logActivity(tx, {
        userId: user.id,
        leadId: client.leadId,
        type: "STATUS_CHANGED",
        message: `Клиент «${client.name}» удалён. Заявка возвращена на этап «Переговоры»`,
      });
    }
  });

  revalidatePath("/clients");
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  if (client.leadId) revalidatePath(`/leads/${client.leadId}`);
  return { ok: true };
}
