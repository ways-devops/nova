// Тонкая обёртка над Telegram Bot API. Ничего не бросает наружу:
// уведомления — вспомогательная функция и не должны ломать основной сценарий.

const API = "https://api.telegram.org";

export type SendResult = { ok: true } | { ok: false; error: string };

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim(),
  );
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type TgResponse<T> = { ok: boolean; result?: T; description?: string };

async function tgCall<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { ok: false, error: "Не задан TELEGRAM_BOT_TOKEN" };

  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as TgResponse<T>;
    if (!data.ok || data.result === undefined) {
      return { ok: false, error: data.description ?? `Ошибка Telegram (HTTP ${res.status})` };
    }
    return { ok: true, result: data.result };
  } catch (e) {
    // Текст исходной ошибки не отдаём: в нём может быть адрес с токеном
    const timeout = e instanceof Error && e.name === "TimeoutError";
    return {
      ok: false,
      error: timeout ? "Telegram не ответил за 10 секунд" : "Не удалось связаться с Telegram",
    };
  }
}

/** Отправляет HTML-сообщение в чат из TELEGRAM_CHAT_ID. */
export async function sendTelegram(html: string): Promise<SendResult> {
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!chatId) return { ok: false, error: "Не задан TELEGRAM_CHAT_ID" };

  const res = await tgCall<unknown>("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  return res.ok ? { ok: true } : res;
}

type Update = {
  message?: {
    chat: {
      id: number;
      type: string;
      title?: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
};

/** Находит chat id: чаты, из которых боту уже писали. */
export async function findTelegramChats(): Promise<
  { ok: true; chats: { id: number; title: string }[] } | { ok: false; error: string }
> {
  const res = await tgCall<Update[]>("getUpdates", { limit: 50 });
  if (!res.ok) return res;

  const seen = new Map<number, string>();
  for (const u of res.result) {
    const c = u.message?.chat;
    if (!c || c.type !== "private") continue;
    const name =
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      (c.username ? `@${c.username}` : String(c.id));
    seen.set(c.id, name);
  }
  return { ok: true, chats: [...seen.entries()].map(([id, title]) => ({ id, title })) };
}
