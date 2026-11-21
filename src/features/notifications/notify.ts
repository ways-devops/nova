import { escapeHtml, isTelegramConfigured, sendTelegram } from "@/lib/telegram";
import { formatDateTime } from "@/lib/utils/date";
import { formatRub } from "@/lib/utils/format";

// Ссылку в Telegram добавляем только для публичного https-адреса:
// ссылки на localhost в мессенджере бесполезны.
function crmLink(path: string): string {
  const base = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (!base || !base.startsWith("https://")) return "";
  return `\n<a href="${base}${path}">Открыть в CRM</a>`;
}

function clip(s: string, n = 300): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export async function notifyNewLead(p: {
  leadId: string;
  name: string;
  text: string;
  itemTitle?: string | null;
}): Promise<void> {
  if (!isTelegramConfigured()) return;
  const lines = [
    "🆕 <b>Новое обращение</b>",
    `Клиент: ${escapeHtml(p.name)}`,
    p.itemTitle ? `Объявление: ${escapeHtml(clip(p.itemTitle, 120))}` : null,
    `«${escapeHtml(clip(p.text))}»`,
  ].filter(Boolean);
  await sendTelegram(lines.join("\n") + crmLink(`/leads/${p.leadId}`));
}

export async function notifyNewMessage(p: {
  leadId: string;
  name: string;
  text: string;
}): Promise<void> {
  if (!isTelegramConfigured()) return;
  await sendTelegram(
    `💬 <b>Новое сообщение</b> от ${escapeHtml(p.name)}\n«${escapeHtml(clip(p.text))}»` +
      crmLink(`/leads/${p.leadId}`),
  );
}

export async function notifyNewClient(p: {
  clientId: string;
  name: string;
  monthlyFee: number;
}): Promise<void> {
  if (!isTelegramConfigured()) return;
  await sendTelegram(
    `🎉 <b>Новый клиент</b>: ${escapeHtml(p.name)}\nСтоимость: ${formatRub(p.monthlyFee)}/мес` +
      crmLink(`/clients/${p.clientId}`),
  );
}

export async function sendTaskReminder(p: {
  title: string;
  dueAt: Date;
  description?: string | null;
  targetName?: string | null;
  link?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const lines = [
    `⏰ <b>Задача:</b> ${escapeHtml(p.title)}`,
    `Срок: ${formatDateTime(p.dueAt)}`,
    p.targetName ? `Клиент: ${escapeHtml(p.targetName)}` : null,
    p.description ? escapeHtml(clip(p.description, 200)) : null,
  ].filter(Boolean);
  return sendTelegram(lines.join("\n") + (p.link ? crmLink(p.link) : ""));
}
