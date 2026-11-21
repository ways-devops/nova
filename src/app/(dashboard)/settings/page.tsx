import Link from "next/link";
import { logoutAction } from "@/app/(auth)/login/actions";
import { requireUser } from "@/lib/auth/session";
import {
  IntegrationsPanel,
  type IntegrationStatus,
} from "@/components/settings/IntegrationsPanel";
import { getAvitoSettings, isAvitoConfigured } from "@/features/avito/client";
import { formatDateTime } from "@/lib/utils/date";

export const metadata = { title: "Настройки" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const avito = await getAvitoSettings();

  const status: IntegrationStatus = {
    telegramToken: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
    telegramChat: Boolean(process.env.TELEGRAM_CHAT_ID?.trim()),
    avitoKeys: isAvitoConfigured(),
    webhookSecret: (process.env.AVITO_WEBHOOK_SECRET?.trim().length ?? 0) >= 16,
    appUrlHttps: Boolean(process.env.APP_URL?.trim().startsWith("https://")),
    avitoUserId: avito.userId ?? null,
    lastSync: avito.lastSyncAt ? formatDateTime(avito.lastSyncAt) : null,
    lastError: avito.lastError ?? null,
    lastWebhook: avito.lastWebhookAt ? formatDateTime(avito.lastWebhookAt) : null,
    lastWebhookRaw: avito.lastWebhookRaw ?? null,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-semibold">Настройки</h1>

      {/* На телефоне в нижней панели нет всех разделов — даём ссылки здесь */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 md:hidden">
        <h2 className="text-sm font-medium text-slate-500">Разделы</h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {[
            { href: "/clients", label: "Клиенты" },
            { href: "/messages", label: "Сообщения" },
            { href: "/analytics", label: "Аналитика" },
          ].map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block py-3 font-medium">
                {l.label} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium text-slate-500">Аккаунт</h2>
        <p className="mt-2 font-medium">{user.name}</p>
        <p className="text-sm text-slate-500">{user.email}</p>
        <form action={logoutAction} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Выйти
          </button>
        </form>
      </section>

      <IntegrationsPanel status={status} />
    </div>
  );
}
