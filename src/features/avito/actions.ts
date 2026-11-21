"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/features/activity/log";
import { firstError } from "@/lib/validations/common";
import type { FormState } from "@/features/leads/types";
import { AvitoError, isAvitoConfigured, markChatRead, sendText } from "./client";

const replySchema = z.object({
  text: z.string().trim().min(1, "Введите сообщение").max(1000, "Не длиннее 1000 символов"),
});

/**
 * Отправка ответа клиенту через Авито.
 * Сообщение считается доставленным только после подтверждения API:
 * сначала запись PENDING, затем SENT (с внешним ID) или FAILED.
 */
export async function sendAvitoMessageAction(
  conversationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = replySchema.safeParse({ text: formData.get("text") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { text } = parsed.data;

  if (!isAvitoConfigured()) {
    return { error: "Авито не подключён: задайте ключи в .env и проверьте подключение в Настройках" };
  }

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.source !== "AVITO") {
    return { error: "Диалог не найден" };
  }

  const pending = await prisma.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      text,
      deliveryStatus: "PENDING",
      sentAt: new Date(),
    },
  });

  let externalId: string | null = null;
  let sentAt = new Date();
  try {
    const res = await sendText(conversation.externalId, text);
    externalId = res?.id ?? null;
    if (res?.created) sentAt = new Date(res.created * 1000);
  } catch (e) {
    await prisma.message.update({
      where: { id: pending.id },
      data: { deliveryStatus: "FAILED" },
    });
    revalidatePath(`/messages/${conversationId}`);
    return {
      error: e instanceof AvitoError ? e.message : "Не удалось отправить сообщение",
    };
  }

  try {
    await prisma.message.update({
      where: { id: pending.id },
      data: { deliveryStatus: "SENT", externalId, sentAt },
    });
  } catch (e) {
    // Webhook с этим же сообщением успел записаться раньше — убираем дубль
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      await prisma.message.delete({ where: { id: pending.id } });
    } else {
      throw e;
    }
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: sentAt,
      lastMessagePreview: text.length > 120 ? `${text.slice(0, 120)}…` : text,
    },
  });
  await logActivity(prisma, {
    userId: user.id,
    leadId: conversation.leadId,
    type: "MESSAGE_SENT",
    message: `Ответ клиенту: ${text.length > 200 ? `${text.slice(0, 200)}…` : text}`,
  });

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { saved: true };
}

/** Сбрасывает счётчик непрочитанных (и по возможности отмечает чат прочитанным в Авито). */
export async function markConversationReadAction(conversationId: string): Promise<void> {
  await requireUser();

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return;

  if (conversation.unread > 0) {
    await prisma.conversation.update({ where: { id: conversationId }, data: { unread: 0 } });
    revalidatePath("/messages");
  }
  if (isAvitoConfigured()) {
    try {
      await markChatRead(conversation.externalId);
    } catch {
      /* отметка в Авито вторична */
    }
  }
}
