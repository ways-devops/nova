import { patchAvitoSettings } from "./client";
import { ingestAvitoMessage } from "./ingest";

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function str(v: unknown): string | null {
  if (typeof v === "string" && v) return v;
  if (typeof v === "number") return String(v);
  return null;
}

/**
 * Обработка события из webhook. Разбор написан терпимо к вариантам формата:
 * сообщение ищется в payload.value, payload или в корне тела.
 * Необработанное событие подхватит периодическая синхронизация.
 */
export async function handleAvitoWebhook(body: unknown): Promise<void> {
  // Сырое тело сохраняем для диагностики (в Настройках) — оно без секретов
  await patchAvitoSettings({
    lastWebhookAt: new Date().toISOString(),
    lastWebhookRaw: JSON.stringify(body).slice(0, 3000),
  }).catch(() => {});

  const root = rec(body);
  const payload = rec(root?.payload);
  const value = rec(payload?.value) ?? payload ?? root;
  if (!value) return;

  const eventType = str(payload?.type) ?? "message";
  if (eventType !== "message") return;

  const chatId = str(value.chat_id);
  const messageId = str(value.id);
  if (!chatId || !messageId) {
    await patchAvitoSettings({
      lastError: "Webhook: в событии не найдены chat_id или id сообщения",
    }).catch(() => {});
    return;
  }

  const content = rec(value.content);
  const rawText = typeof content?.text === "string" ? content.text.trim() : "";
  const msgType = str(value.type);
  const created = typeof value.created === "number" ? value.created : null;

  await ingestAvitoMessage({
    chatId,
    messageId,
    authorId: typeof value.author_id === "number" ? value.author_id : null,
    direction: null,
    text: rawText || `[${msgType ?? "вложение"}]`,
    createdAt: created ? new Date(created * 1000) : new Date(),
  });
}
