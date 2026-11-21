import { prisma } from "@/lib/db/prisma";
import {
  getAvitoSettings,
  isAvitoConfigured,
  listChats,
  listMessages,
  patchAvitoSettings,
} from "./client";
import { ingestAvitoMessage, messageText } from "./ingest";

const DAY = 24 * 60 * 60 * 1000;
// Старые диалоги без нашего диалога не превращаем в заявки
const BACKFILL_DAYS = 14;

/**
 * Опрос Авито: догоняет сообщения, которые не дошли через webhook
 * (или заменяет webhook, пока у CRM нет публичного адреса).
 */
export async function syncAvito(): Promise<{
  chats: number;
  newMessages: number;
  skipped?: boolean;
}> {
  if (!isAvitoConfigured()) return { chats: 0, newMessages: 0, skipped: true };

  const g = globalThis as unknown as { __avitoSyncing?: boolean };
  if (g.__avitoSyncing) return { chats: 0, newMessages: 0, skipped: true };
  g.__avitoSyncing = true;

  try {
    const chats = await listChats(50);
    const ignored = new Set((await getAvitoSettings()).ignoredChats ?? []);
    let newMessages = 0;

    for (const chat of chats) {
      if (ignored.has(chat.id)) continue;

      // Последнее сообщение чата уже сохранено — диалог актуален
      const lastId = chat.last_message?.id;
      if (lastId) {
        const known = await prisma.message.findFirst({
          where: { externalId: lastId, conversation: { source: "AVITO", externalId: chat.id } },
          select: { id: true },
        });
        if (known) continue;
      }

      // Старые чаты без нашего диалога пропускаем
      const lastTs = chat.last_message?.created;
      if (lastTs && Date.now() - lastTs * 1000 > BACKFILL_DAYS * DAY) {
        const exists = await prisma.conversation.findUnique({
          where: { source_externalId: { source: "AVITO", externalId: chat.id } },
          select: { id: true },
        });
        if (!exists) continue;
      }

      const messages = await listMessages(chat.id, 50);
      messages.sort((a, b) => (a.created ?? 0) - (b.created ?? 0));

      for (const msg of messages) {
        if (!msg.id) continue;
        const result = await ingestAvitoMessage({
          chatId: chat.id,
          messageId: msg.id,
          authorId: msg.author_id ?? null,
          direction: msg.direction ?? null,
          text: messageText(msg),
          createdAt: new Date((msg.created ?? Math.floor(Date.now() / 1000)) * 1000),
        });
        if (result === "created") newMessages += 1;
      }
    }

    await patchAvitoSettings({ lastSyncAt: new Date().toISOString(), lastError: null });
    return { chats: chats.length, newMessages };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    await patchAvitoSettings({ lastError: message }).catch(() => {});
    throw e;
  } finally {
    g.__avitoSyncing = false;
  }
}
