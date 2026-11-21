import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/features/activity/log";
import { notifyNewLead, notifyNewMessage } from "@/features/notifications/notify";
import { getAvitoSettings, getChat, getUserId, type AvitoMessage } from "./client";

export type IncomingAvitoMessage = {
  chatId: string;
  messageId: string;
  authorId?: number | null;
  direction?: string | null; // "in" | "out", если Авито передал
  text: string;
  createdAt: Date;
};

// Уведомляем только о свежих сообщениях: при первой синхронизации
// старая переписка не должна засыпать Telegram.
const FRESH_MS = 30 * 60 * 1000;

export function messageText(m: Pick<AvitoMessage, "content" | "type">): string {
  const t = m.content?.text?.trim();
  return t || `[${m.type ?? "вложение"}]`;
}

function clip(s: string, n: number) {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

const conversationInclude = {
  lead: { select: { id: true, name: true } },
} as const;

/** Находит диалог или создаёт лид + диалог (в одной транзакции). */
async function resolveConversation(
  chatId: string,
  firstMessageAt: Date,
  ownUserId: number | null,
) {
  const where = { source_externalId: { source: "AVITO" as const, externalId: chatId } };

  const existing = await prisma.conversation.findUnique({
    where,
    include: conversationInclude,
  });
  if (existing) return { conversation: existing, created: false, itemTitle: null };

  let name = "Клиент Авито";
  let itemTitle: string | null = null;
  try {
    const info = await getChat(chatId);
    const other = info.users?.find((u) => u.id !== ownUserId) ?? info.users?.[0];
    if (other?.name) name = other.name;
    itemTitle = info.context?.value?.title ?? null;
  } catch {
    // имя собеседника не критично — заявка создастся с именем по умолчанию
  }

  const owner = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!owner) throw new Error("В CRM нет пользователя — выполните npm run db:seed");

  try {
    const conversation = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          ownerId: owner.id,
          name,
          source: "AVITO",
          comment: itemTitle ? `Объявление на Авито: ${itemTitle}` : null,
          receivedAt: firstMessageAt,
        },
      });
      const conv = await tx.conversation.create({
        data: {
          leadId: lead.id,
          source: "AVITO",
          externalId: chatId,
          interlocutorName: name,
        },
        include: conversationInclude,
      });
      await logActivity(tx, {
        leadId: lead.id,
        type: "LEAD_CREATED",
        message: itemTitle
          ? `Заявка создана автоматически из Авито (объявление: ${itemTitle})`
          : "Заявка создана автоматически из Авито",
      });
      return conv;
    });
    return { conversation, created: true, itemTitle };
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    // Параллельное событие уже создало этот диалог
    const again = await prisma.conversation.findUnique({
      where,
      include: conversationInclude,
    });
    if (!again) throw e;
    return { conversation: again, created: false, itemTitle: null };
  }
}

/**
 * Сохраняет входящее/исходящее сообщение Авито.
 * Идемпотентно: повторное событие с тем же внешним ID возвращает "duplicate".
 */
export async function ingestAvitoMessage(
  m: IncomingAvitoMessage,
): Promise<"created" | "duplicate"> {
  const settings = await getAvitoSettings();
  // Диалог удалённой заявки — пропускаем, чтобы она не появилась снова
  if (settings.ignoredChats?.includes(m.chatId)) return "duplicate";

  let ownId: number | null = settings.userId ?? null;
  if (ownId === null) {
    try {
      ownId = await getUserId();
    } catch {
      /* определим направление по полю direction или посчитаем входящим */
    }
  }

  const outbound =
    m.direction === "out" ||
    (m.direction !== "in" && ownId !== null && m.authorId === ownId);

  const { conversation, created, itemTitle } = await resolveConversation(
    m.chatId,
    m.createdAt,
    ownId,
  );

  try {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        externalId: m.messageId,
        direction: outbound ? "OUTBOUND" : "INBOUND",
        text: m.text,
        deliveryStatus: "SENT",
        sentAt: m.createdAt,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return "duplicate";
    throw e;
  }

  const newer = !conversation.lastMessageAt || m.createdAt > conversation.lastMessageAt;
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      ...(newer ? { lastMessageAt: m.createdAt, lastMessagePreview: clip(m.text, 120) } : {}),
      ...(outbound ? {} : { unread: { increment: 1 } }),
    },
  });

  if (!outbound) {
    await logActivity(prisma, {
      leadId: conversation.leadId,
      type: "MESSAGE_RECEIVED",
      message: `Сообщение от клиента: ${clip(m.text, 200)}`,
    });

    if (Date.now() - m.createdAt.getTime() < FRESH_MS) {
      if (created) {
        await notifyNewLead({
          leadId: conversation.leadId,
          name: conversation.lead.name,
          text: m.text,
          itemTitle,
        });
      } else {
        await notifyNewMessage({
          leadId: conversation.leadId,
          name: conversation.lead.name,
          text: m.text,
        });
      }
    }
  }
  return "created";
}
