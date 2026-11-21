"use client";

import { useState, useTransition } from "react";
import { btnSecondary } from "@/components/ui/styles";
import {
  checkAvitoAction,
  findTelegramChatAction,
  subscribeAvitoWebhookAction,
  syncAvitoNowAction,
  testTelegramAction,
  type InfoResult,
} from "@/features/integrations/actions";

export type IntegrationStatus = {
  telegramToken: boolean;
  telegramChat: boolean;
  avitoKeys: boolean;
  webhookSecret: boolean;
  appUrlHttps: boolean;
  avitoUserId: number | null;
  lastSync: string | null;
  lastError: string | null;
  lastWebhook: string | null;
  lastWebhookRaw: string | null;
};

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={ok ? "text-emerald-600" : "text-slate-300"}>{ok ? "✓" : "○"}</span>
      <span className={ok ? "" : "text-slate-500"}>{label}</span>
    </li>
  );
}

function ActionButton({
  label,
  run,
}: {
  label: string;
  run: () => Promise<InfoResult>;
}) {
  const [result, setResult] = useState<InfoResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={pending}
        className={btnSecondary}
        onClick={() => {
          setResult(null);
          startTransition(async () => setResult(await run()));
        }}
      >
        {pending ? "Подождите…" : label}
      </button>
      {result && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${
            result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}

export function IntegrationsPanel({ status }: { status: IntegrationStatus }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium">Telegram</h2>
        <p className="mt-1 text-sm text-slate-500">
          Уведомления о новых обращениях, сообщениях, клиентах и задачах.
        </p>
        <ul className="mt-3 space-y-1">
          <Check ok={status.telegramToken} label="TELEGRAM_BOT_TOKEN задан" />
          <Check ok={status.telegramChat} label="TELEGRAM_CHAT_ID задан" />
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <ActionButton label="Найти chat id" run={findTelegramChatAction} />
          <ActionButton label="Отправить тест" run={testTelegramAction} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium">Авито</h2>
        <p className="mt-1 text-sm text-slate-500">
          Получение сообщений, создание заявок и ответы из CRM.
        </p>
        <ul className="mt-3 space-y-1">
          <Check ok={status.avitoKeys} label="AVITO_CLIENT_ID и AVITO_CLIENT_SECRET заданы" />
          <Check
            ok={status.avitoUserId !== null}
            label={
              status.avitoUserId !== null
                ? `Аккаунт определён (ID ${status.avitoUserId})`
                : "Подключение не проверено"
            }
          />
          <Check ok={status.appUrlHttps} label="APP_URL с HTTPS (нужен только для webhook)" />
          <Check ok={status.webhookSecret} label="AVITO_WEBHOOK_SECRET задан (для webhook)" />
        </ul>

        <dl className="mt-3 space-y-1 text-sm text-slate-500">
          <div>Последняя синхронизация: {status.lastSync ?? "ещё не выполнялась"}</div>
          <div>Последний webhook: {status.lastWebhook ?? "не поступал"}</div>
          {status.lastError && (
            <div className="text-red-600">Последняя ошибка: {status.lastError}</div>
          )}
        </dl>

        <div className="mt-4 flex flex-wrap gap-3">
          <ActionButton label="Проверить подключение" run={checkAvitoAction} />
          <ActionButton label="Синхронизировать сейчас" run={syncAvitoNowAction} />
          <ActionButton label="Подключить webhook" run={subscribeAvitoWebhookAction} />
        </div>

        {status.lastWebhookRaw && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-slate-500">
              Последнее событие webhook (для диагностики)
            </summary>
            <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
              {status.lastWebhookRaw}
            </pre>
          </details>
        )}
      </section>
    </div>
  );
}
