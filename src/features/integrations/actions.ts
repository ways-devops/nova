"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { findTelegramChats, isTelegramConfigured, sendTelegram } from "@/lib/telegram";
import {
  AvitoError,
  getAccessToken,
  getSelfAccount,
  isAvitoConfigured,
  patchAvitoSettings,
  subscribeWebhook,
} from "@/features/avito/client";
import { syncAvito } from "@/features/avito/sync";

export type InfoResult = { ok: boolean; message: string };

function errText(e: unknown): string {
  return e instanceof Error ? e.message : "Неизвестная ошибка";
}

export async function testTelegramAction(): Promise<InfoResult> {
  await requireUser();
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return { ok: false, message: "Не задан TELEGRAM_BOT_TOKEN в .env" };
  }
  if (!isTelegramConfigured()) {
    return { ok: false, message: "Не задан TELEGRAM_CHAT_ID. Нажмите «Найти chat id»." };
  }
  const res = await sendTelegram("✅ Nova CRM: тестовое уведомление. Telegram подключён.");
  return res.ok
    ? { ok: true, message: "Сообщение отправлено — проверьте Telegram." }
    : { ok: false, message: res.error };
}

export async function findTelegramChatAction(): Promise<InfoResult> {
  await requireUser();
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return { ok: false, message: "Сначала задайте TELEGRAM_BOT_TOKEN в .env" };
  }
  const res = await findTelegramChats();
  if (!res.ok) return { ok: false, message: res.error };
  if (res.chats.length === 0) {
    return {
      ok: false,
      message: "Чатов не найдено. Напишите вашему боту любое сообщение и нажмите снова.",
    };
  }
  const list = res.chats.map((c) => `${c.title}: ${c.id}`).join("; ");
  return {
    ok: true,
    message: `Найдено — ${list}. Вставьте нужное число в TELEGRAM_CHAT_ID и перезапустите приложение.`,
  };
}

export async function checkAvitoAction(): Promise<InfoResult> {
  await requireUser();
  if (!isAvitoConfigured()) {
    return { ok: false, message: "Задайте AVITO_CLIENT_ID и AVITO_CLIENT_SECRET в .env" };
  }
  try {
    await getAccessToken(true);
    const account = await getSelfAccount();
    await patchAvitoSettings({ userId: account.id, lastError: null });
    revalidatePath("/settings");
    return {
      ok: true,
      message: `Подключено: ${account.name ?? "аккаунт Авито"} (ID ${account.id}).`,
    };
  } catch (e) {
    const message = errText(e);
    await patchAvitoSettings({ lastError: message }).catch(() => {});
    revalidatePath("/settings");
    return { ok: false, message };
  }
}

export async function syncAvitoNowAction(): Promise<InfoResult> {
  await requireUser();
  if (!isAvitoConfigured()) {
    return { ok: false, message: "Авито не настроен: нет ключей в .env" };
  }
  try {
    const r = await syncAvito();
    revalidatePath("/settings");
    revalidatePath("/messages");
    if (r.skipped) return { ok: true, message: "Синхронизация уже выполняется, подождите." };
    return {
      ok: true,
      message: `Проверено диалогов: ${r.chats}, новых сообщений: ${r.newMessages}.`,
    };
  } catch (e) {
    revalidatePath("/settings");
    return { ok: false, message: errText(e) };
  }
}

export async function subscribeAvitoWebhookAction(): Promise<InfoResult> {
  await requireUser();
  if (!isAvitoConfigured()) {
    return { ok: false, message: "Авито не настроен: нет ключей в .env" };
  }
  const base = process.env.APP_URL?.trim().replace(/\/+$/, "");
  const secret = process.env.AVITO_WEBHOOK_SECRET?.trim();
  if (!base || !base.startsWith("https://")) {
    return {
      ok: false,
      message:
        "Для webhook нужен публичный адрес с HTTPS (APP_URL). Пока его нет, сообщения подтягиваются опросом каждые 2 минуты.",
    };
  }
  if (!secret || secret.length < 16) {
    return { ok: false, message: "Задайте AVITO_WEBHOOK_SECRET (не короче 16 символов)" };
  }
  try {
    await subscribeWebhook(`${base}/api/webhooks/avito?token=${encodeURIComponent(secret)}`);
    return { ok: true, message: "Webhook подключён: Авито будет присылать сообщения сразу." };
  } catch (e) {
    return { ok: false, message: e instanceof AvitoError ? e.message : errText(e) };
  }
}
