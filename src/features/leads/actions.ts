"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyNewClient } from "@/features/notifications/notify";
import { ignoreChats } from "@/features/avito/client";
import type { DealStatus, Lead, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/features/activity/log";
import { LEAD_STATUS_LABEL } from "@/lib/labels";
import { normalizePhone } from "@/lib/utils/phone";
import { parseInputDate } from "@/lib/utils/date";
import { firstError } from "@/lib/validations/common";
import {
  leadSchema,
  lostSchema,
  noteSchema,
  statusSchema,
  winSchema,
  type LeadInput,
} from "@/lib/validations/lead";
import type { ActionResult, FormState } from "./types";

function revalidateLeads(leadId?: string) {
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

function parseLeadForm(formData: FormData) {
  return leadSchema.safeParse(Object.fromEntries(formData));
}

function toLeadData(d: LeadInput) {
  return {
    name: d.name,
    phone: normalizePhone(d.phone),
    company: d.company ?? null,
    businessType: d.businessType ?? null,
    city: d.city ?? null,
    source: d.source,
    service: d.service ?? null,
    budget: d.budget ?? null,
    comment: d.comment ?? null,
    ...(d.receivedAt ? { receivedAt: parseInputDate(d.receivedAt) } : {}),
  };
}

/** Закрывает открытую сделку по заявке (или создаёт закрытую, если её не было). */
async function closeDeal(
  tx: Prisma.TransactionClient,
  lead: Lead,
  status: Exclude<DealStatus, "OPEN">,
  extra: { amount?: number | null; clientId?: string; lostReason?: string },
) {
  const data = {
    status,
    amount: extra.amount ?? lead.budget,
    clientId: extra.clientId,
    lostReason: extra.lostReason,
    closedAt: new Date(),
  };
  const open = await tx.deal.findFirst({
    where: { leadId: lead.id, status: "OPEN" },
  });
  if (open) {
    await tx.deal.update({ where: { id: open.id }, data });
  } else {
    await tx.deal.create({
      data: {
        ...data,
        leadId: lead.id,
        title: `Обслуживание: ${lead.company || lead.name}`,
      },
    });
  }
}

// ───────── Создание и редактирование ─────────

export async function createLeadAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseLeadForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const lead = await prisma.lead.create({
    data: { ownerId: user.id, ...toLeadData(parsed.data) },
  });
  await logActivity(prisma, {
    userId: user.id,
    leadId: lead.id,
    type: "LEAD_CREATED",
    message: "Заявка создана вручную",
  });

  revalidateLeads();
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadAction(
  leadId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseLeadForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing || existing.mergedIntoId) {
    return { error: "Заявка не найдена" };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: toLeadData(parsed.data),
  });
  await logActivity(prisma, {
    userId: user.id,
    leadId,
    type: "LEAD_UPDATED",
    message: "Данные заявки обновлены",
  });

  revalidateLeads(leadId);
  return { saved: true };
}

export async function addNoteAction(
  leadId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = noteSchema.safeParse({ text: formData.get("text") });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.mergedIntoId) return { error: "Заявка не найдена" };

  await logActivity(prisma, {
    userId: user.id,
    leadId,
    type: "NOTE",
    message: parsed.data.text,
  });

  revalidatePath(`/leads/${leadId}`);
  return { saved: true };
}

// ───────── Статусы воронки ─────────

/** Смена статуса для всех этапов, кроме Won и Lost (у них свои действия). */
export async function changeStatusAction(
  leadId: string,
  status: LeadStatus,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedStatus.success) return { ok: false, error: "Неизвестный статус" };
  if (status === "WON" || status === "LOST") {
    return { ok: false, error: "Для этого этапа нужны дополнительные данные" };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.mergedIntoId) {
    return { ok: false, error: "Заявка не найдена" };
  }
  if (lead.status === "WON") {
    return {
      ok: false,
      error: "Заявка уже стала клиентом. Изменения вносите в карточке клиента.",
    };
  }
  if (lead.status === status) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { status, lostReason: null },
    });
    await logActivity(tx, {
      userId: user.id,
      leadId,
      type: "STATUS_CHANGED",
      message: `Статус: ${LEAD_STATUS_LABEL[lead.status]} → ${LEAD_STATUS_LABEL[status]}`,
      meta: { from: lead.status, to: status },
    });
  });

  revalidateLeads(leadId);
  return { ok: true };
}

/** Перевод в Lost — причина обязательна. */
export async function markLostAction(
  leadId: string,
  reason: string,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = lostSchema.safeParse({ reason });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.mergedIntoId) {
    return { ok: false, error: "Заявка не найдена" };
  }
  if (lead.status === "WON") {
    return { ok: false, error: "Заявка уже стала клиентом" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { status: "LOST", lostReason: parsed.data.reason },
    });
    await closeDeal(tx, lead, "LOST", { lostReason: parsed.data.reason });
    await logActivity(tx, {
      userId: user.id,
      leadId,
      type: "STATUS_CHANGED",
      message: `Статус: ${LEAD_STATUS_LABEL[lead.status]} → ${LEAD_STATUS_LABEL.LOST}. Причина: ${parsed.data.reason}`,
      meta: { from: lead.status, to: "LOST", reason: parsed.data.reason },
    });
  });

  revalidateLeads(leadId);
  return { ok: true };
}

/** Перевод в Won — создаёт постоянного клиента с согласованной стоимостью. */
export async function winLeadAction(
  leadId: string,
  input: { monthlyFee: number | string; startDate?: string; taxSystem?: string },
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = winSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { monthlyFee, startDate, taxSystem } = parsed.data;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { client: { select: { id: true } } },
  });
  if (!lead || lead.mergedIntoId) {
    return { ok: false, error: "Заявка не найдена" };
  }
  if (lead.client || lead.status === "WON") {
    return { ok: false, error: "Клиент по этой заявке уже создан" };
  }

  try {
    const clientId = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          ownerId: user.id,
          leadId: lead.id,
          name: lead.company?.trim() || lead.name,
          businessType: lead.businessType,
          taxSystem,
          services: lead.service ? [lead.service] : [],
          monthlyFee,
          startDate: startDate ? parseInputDate(startDate) : new Date(),
          phone: lead.phone,
          contactPerson: lead.company ? lead.name : null,
          notes: lead.comment,
        },
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: { status: "WON", lostReason: null },
      });
      await closeDeal(tx, lead, "WON", { amount: monthlyFee, clientId: client.id });
      await logActivity(tx, {
        userId: user.id,
        leadId: lead.id,
        clientId: client.id,
        type: "STATUS_CHANGED",
        message: `Статус: ${LEAD_STATUS_LABEL[lead.status]} → ${LEAD_STATUS_LABEL.WON}`,
        meta: { from: lead.status, to: "WON" },
      });
      await logActivity(tx, {
        userId: user.id,
        leadId: lead.id,
        clientId: client.id,
        type: "CLIENT_CREATED",
        message: `Создан постоянный клиент, стоимость обслуживания ${monthlyFee} ₽/мес`,
        meta: { monthlyFee },
      });
      return client.id;
    });

    // Telegram-уведомление отправляем после ответа, чтобы не задерживать интерфейс
    after(() =>
      notifyNewClient({
        clientId,
        name: lead.company?.trim() || lead.name,
        monthlyFee,
      }),
    );

    revalidateLeads(leadId);
    return { ok: true, clientId };
  } catch {
    return { ok: false, error: "Не удалось создать клиента. Попробуйте ещё раз." };
  }
}

// ───────── Объединение повторных заявок ─────────

/** Сливает заявку-дубликат в основную: переносит историю, задачи, диалоги. */
export async function mergeLeadsAction(
  primaryId: string,
  duplicateId: string,
): Promise<ActionResult> {
  const user = await requireUser();

  if (primaryId === duplicateId) {
    return { ok: false, error: "Нельзя объединить заявку с самой собой" };
  }

  const [primary, duplicate] = await Promise.all([
    prisma.lead.findUnique({ where: { id: primaryId } }),
    prisma.lead.findUnique({
      where: { id: duplicateId },
      include: { client: { select: { id: true } } },
    }),
  ]);
  if (!primary || !duplicate || primary.mergedIntoId || duplicate.mergedIntoId) {
    return { ok: false, error: "Заявка не найдена" };
  }
  if (duplicate.client || duplicate.status === "WON") {
    return {
      ok: false,
      error: "По дубликату уже создан клиент, объединение невозможно",
    };
  }

  await prisma.$transaction(async (tx) => {
    // Пустые поля основной заявки добираем из дубликата
    await tx.lead.update({
      where: { id: primaryId },
      data: {
        phone: primary.phone ?? duplicate.phone,
        company: primary.company ?? duplicate.company,
        businessType: primary.businessType ?? duplicate.businessType,
        city: primary.city ?? duplicate.city,
        service: primary.service ?? duplicate.service,
        budget: primary.budget ?? duplicate.budget,
        comment: primary.comment ?? duplicate.comment,
        receivedAt:
          duplicate.receivedAt < primary.receivedAt
            ? duplicate.receivedAt
            : primary.receivedAt,
      },
    });

    await tx.conversation.updateMany({
      where: { leadId: duplicateId },
      data: { leadId: primaryId },
    });
    await tx.task.updateMany({
      where: { leadId: duplicateId },
      data: { leadId: primaryId },
    });
    await tx.deal.updateMany({
      where: { leadId: duplicateId },
      data: { leadId: primaryId },
    });
    await tx.activity.updateMany({
      where: { leadId: duplicateId },
      data: { leadId: primaryId },
    });

    // Дубликат не удаляем — он ссылается на основную заявку
    await tx.lead.update({
      where: { id: duplicateId },
      data: { mergedIntoId: primaryId },
    });

    await logActivity(tx, {
      userId: user.id,
      leadId: primaryId,
      type: "LEADS_MERGED",
      message: `Объединено с повторной заявкой «${duplicate.name}»`,
      meta: { duplicateId },
    });
  });

  revalidateLeads(primaryId);
  return { ok: true };
}

// ───────── Удаление ─────────

/**
 * Удаляет заявку вместе с задачами, сделками, перепиской и историей.
 * Постоянный клиент (если заявка стала клиентом) остаётся в своём разделе.
 * Объединённые дубликаты этой заявки удаляются вместе с ней.
 */
export async function deleteLeadAction(leadId: string): Promise<ActionResult> {
  await requireUser();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      conversations: { select: { source: true, externalId: true } },
      mergedFrom: { select: { id: true } },
    },
  });
  if (!lead) return { ok: true };
  if (lead.mergedIntoId) {
    return { ok: false, error: "Заявка объединена с другой — откройте основную заявку" };
  }

  const duplicateIds = lead.mergedFrom.map((l) => l.id);
  const ids = [lead.id, ...duplicateIds];

  await prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({ where: { leadId: { in: ids } } });
    await tx.deal.deleteMany({ where: { leadId: { in: ids } } });
    await tx.conversation.deleteMany({ where: { leadId: { in: ids } } }); // сообщения удаляются каскадно
    // История: записи, относящиеся ещё и к клиенту, сохраняем (отвязываем от заявки)
    await tx.activity.deleteMany({ where: { leadId: { in: ids }, clientId: null } });
    await tx.activity.updateMany({ where: { leadId: { in: ids } }, data: { leadId: null } });
    await tx.client.updateMany({ where: { leadId: { in: ids } }, data: { leadId: null } });
    if (duplicateIds.length > 0) {
      await tx.lead.deleteMany({ where: { id: { in: duplicateIds } } });
    }
    await tx.lead.delete({ where: { id: leadId } });
  });

  // Диалоги Авито запоминаем, иначе синхронизация создаст заявку заново
  const chatIds = lead.conversations
    .filter((c) => c.source === "AVITO")
    .map((c) => c.externalId);
  await ignoreChats(chatIds).catch(() => {});

  revalidateLeads(leadId);
  return { ok: true };
}
