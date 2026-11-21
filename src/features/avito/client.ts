// Клиент Messenger API Авито. Все пути запросов собраны в этом файле:
// если Авито изменит API или формат окажется другим, править нужно только здесь.
// ВАЖНО: написан по документации из памяти и не проверялся на живом аккаунте —
// используйте кнопку «Проверить подключение» в Настройках.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const BASE = "https://api.avito.ru";

export class AvitoError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "AvitoError";
  }
}

// ───────── Настройки интеграции (хранятся в таблице Integration) ─────────

export type AvitoSettings = {
  userId?: number;
  lastSyncAt?: string;
  lastError?: string | null;
  lastWebhookAt?: string;
  lastWebhookRaw?: string;
  /** Диалоги удалённых заявок: не создаём по ним заявки заново. */
  ignoredChats?: string[];
};

export function isAvitoConfigured(): boolean {
  return Boolean(
    process.env.AVITO_CLIENT_ID?.trim() && process.env.AVITO_CLIENT_SECRET?.trim(),
  );
}

export async function getAvitoSettings(): Promise<AvitoSettings> {
  const row = await prisma.integration.findUnique({ where: { type: "AVITO" } });
  return (row?.settings as AvitoSettings | null) ?? {};
}

export async function patchAvitoSettings(patch: Partial<AvitoSettings>): Promise<void> {
  const next = { ...(await getAvitoSettings()), ...patch };
  const json = next as unknown as Prisma.InputJsonValue;
  await prisma.integration.upsert({
    where: { type: "AVITO" },
    create: { type: "AVITO", enabled: true, settings: json },
    update: { settings: json },
  });
}

/** Запоминает диалоги, чтобы синхронизация не вернула удалённую заявку. */
export async function ignoreChats(chatIds: string[]): Promise<void> {
  if (chatIds.length === 0) return;
  const current = (await getAvitoSettings()).ignoredChats ?? [];
  const next = [...new Set([...current, ...chatIds])].slice(-1000);
  await patchAvitoSettings({ ignoredChats: next });
}

// ───────── OAuth-токен (только на сервере) ─────────

let tokenPromise: Promise<string> | null = null;

async function fetchNewToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.AVITO_CLIENT_ID?.trim() ?? "",
    client_secret: process.env.AVITO_CLIENT_SECRET?.trim() ?? "",
  });

  let res: Response;
  try {
    res = await fetch(`${BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AvitoError("Авито не отвечает при получении токена");
  }
  if (!res.ok) {
    throw new AvitoError(
      `Авито не выдал токен (HTTP ${res.status}). Проверьте AVITO_CLIENT_ID и AVITO_CLIENT_SECRET.`,
      res.status,
    );
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new AvitoError("Авито вернул ответ без access_token");

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
  await prisma.integration.upsert({
    where: { type: "AVITO" },
    create: { type: "AVITO", enabled: true, accessToken: data.access_token, expiresAt },
    update: { accessToken: data.access_token, expiresAt },
  });
  return data.access_token;
}

/** Действующий токен из БД; обновляется за 5 минут до истечения. */
export async function getAccessToken(force = false): Promise<string> {
  if (!force) {
    const row = await prisma.integration.findUnique({ where: { type: "AVITO" } });
    if (
      row?.accessToken &&
      row.expiresAt &&
      row.expiresAt.getTime() > Date.now() + 5 * 60 * 1000
    ) {
      return row.accessToken;
    }
  }
  if (!tokenPromise) {
    tokenPromise = fetchNewToken().finally(() => {
      tokenPromise = null;
    });
  }
  return tokenPromise;
}

// ───────── Базовый запрос ─────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function avitoFetch<T>(
  path: string,
  opts: {
    method?: string;
    body?: unknown;
    query?: Record<string, string | number | boolean>;
    /** false — запрос нельзя безопасно повторять после сбоя (отправка сообщения). */
    idempotent?: boolean;
  } = {},
): Promise<T> {
  const idempotent = opts.idempotent ?? true;
  let forceToken = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = await getAccessToken(forceToken);
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, String(v));

    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      if (idempotent && attempt < 2) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      throw new AvitoError("Авито не отвечает. Попробуйте позже.");
    }

    if (res.status === 401 && !forceToken) {
      forceToken = true; // токен мог отозваться — получаем новый и повторяем один раз
      continue;
    }
    if (res.status === 429 && attempt < 2) {
      await sleep(1000 * (attempt + 1)); // запрос отклонён лимитом, повторять безопасно
      continue;
    }
    if (res.status >= 500 && idempotent && attempt < 2) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new AvitoError(
        `Авито вернул ошибку ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
        res.status,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
  throw new AvitoError("Не удалось выполнить запрос к Авито");
}

// ───────── Методы API ─────────

export type AvitoMessage = {
  id: string;
  author_id?: number;
  created?: number; // unix-время в секундах
  direction?: string; // "in" | "out"
  type?: string;
  content?: { text?: string };
};

export type AvitoChat = {
  id: string;
  users?: { id: number; name?: string }[];
  context?: { value?: { title?: string } };
  last_message?: AvitoMessage;
};

export async function getSelfAccount() {
  return avitoFetch<{ id: number; name?: string; email?: string }>("/core/v1/accounts/self");
}

/** ID аккаунта Авито (кэшируется в настройках). */
export async function getUserId(): Promise<number> {
  const settings = await getAvitoSettings();
  if (settings.userId) return settings.userId;
  const acc = await getSelfAccount();
  await patchAvitoSettings({ userId: acc.id });
  return acc.id;
}

export async function listChats(limit = 50): Promise<AvitoChat[]> {
  const uid = await getUserId();
  const res = await avitoFetch<{ chats?: AvitoChat[] }>(
    `/messenger/v2/accounts/${uid}/chats`,
    { query: { limit, offset: 0, unread_only: false } },
  );
  return res?.chats ?? [];
}

export async function getChat(chatId: string): Promise<AvitoChat> {
  const uid = await getUserId();
  return avitoFetch<AvitoChat>(
    `/messenger/v2/accounts/${uid}/chats/${encodeURIComponent(chatId)}`,
  );
}

export async function listMessages(chatId: string, limit = 50): Promise<AvitoMessage[]> {
  const uid = await getUserId();
  const res = await avitoFetch<AvitoMessage[] | { messages?: AvitoMessage[] }>(
    `/messenger/v3/accounts/${uid}/chats/${encodeURIComponent(chatId)}/messages/`,
    { query: { limit, offset: 0 } },
  );
  if (Array.isArray(res)) return res;
  return res?.messages ?? [];
}

/** Отправка текста. Не повторяется автоматически, чтобы не создать дубль у клиента. */
export async function sendText(chatId: string, text: string): Promise<AvitoMessage> {
  const uid = await getUserId();
  return avitoFetch<AvitoMessage>(
    `/messenger/v1/accounts/${uid}/chats/${encodeURIComponent(chatId)}/messages`,
    { method: "POST", body: { message: { text }, type: "text" }, idempotent: false },
  );
}

export async function markChatRead(chatId: string): Promise<void> {
  const uid = await getUserId();
  await avitoFetch<unknown>(
    `/messenger/v1/accounts/${uid}/chats/${encodeURIComponent(chatId)}/read`,
    { method: "POST", body: {} },
  );
}

export async function subscribeWebhook(url: string): Promise<void> {
  await avitoFetch<unknown>("/messenger/v3/webhook", { method: "POST", body: { url } });
}
