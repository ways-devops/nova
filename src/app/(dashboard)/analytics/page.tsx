import Link from "next/link";
import type { LeadSource, LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { cardCls } from "@/components/ui/styles";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  SOURCE_LABEL,
} from "@/lib/labels";
import { lastMonthKeys, monthKey, monthShort } from "@/lib/utils/date";
import { formatRub } from "@/lib/utils/format";

export const metadata = { title: "Аналитика" };
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

const PERIODS: { key: string; label: string; days: number | null }[] = [
  { key: "30", label: "30 дней", days: 30 },
  { key: "90", label: "90 дней", days: 90 },
  { key: "365", label: "Год", days: 365 },
  { key: "all", label: "Всё время", days: null },
];

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireUser();
  const { period } = await searchParams;
  const current = PERIODS.find((p) => p.key === period) ?? PERIODS[1];

  const now = new Date();
  const since = current.days ? new Date(now.getTime() - current.days * DAY) : null;
  const monthKeys = lastMonthKeys(6, now);
  const chartSince = new Date(now.getTime() - 200 * DAY);

  const [leads, clients, recentLeads, recentClients] = await Promise.all([
    prisma.lead.findMany({
      where: { mergedIntoId: null, ...(since ? { receivedAt: { gte: since } } : {}) },
      select: {
        source: true,
        status: true,
        lostReason: true,
        client: { select: { monthlyFee: true, contractStatus: true } },
      },
      take: 10000,
    }),
    prisma.client.findMany({
      where: { contractStatus: "ACTIVE" },
      select: { monthlyFee: true },
    }),
    prisma.lead.findMany({
      where: { mergedIntoId: null, receivedAt: { gte: chartSince } },
      select: { receivedAt: true },
    }),
    prisma.client.findMany({
      where: { startDate: { gte: chartSince } },
      select: { startDate: true },
    }),
  ]);

  // ── Итоги за период
  const total = leads.length;
  const won = leads.filter((l) => l.status === "WON").length;
  const lost = leads.filter((l) => l.status === "LOST").length;
  const mrr = clients.reduce((acc, c) => acc + c.monthlyFee, 0);
  const avgFee = clients.length > 0 ? Math.round(mrr / clients.length) : 0;

  // ── По источникам
  type Row = { total: number; won: number; lost: number; mrr: number };
  const bySource = new Map<LeadSource, Row>();
  for (const l of leads) {
    const row = bySource.get(l.source) ?? { total: 0, won: 0, lost: 0, mrr: 0 };
    row.total += 1;
    if (l.status === "WON") row.won += 1;
    if (l.status === "LOST") row.lost += 1;
    if (l.client?.contractStatus === "ACTIVE") row.mrr += l.client.monthlyFee;
    bySource.set(l.source, row);
  }
  const sourceRows = [...bySource.entries()].sort((a, b) => b[1].total - a[1].total);

  // ── Воронка (текущее распределение)
  const byStatus = new Map<LeadStatus, number>();
  for (const l of leads) byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1);
  const maxStatus = Math.max(1, ...LEAD_STATUSES.map((s) => byStatus.get(s) ?? 0));

  // ── Причины потерь
  const reasons = new Map<string, number>();
  for (const l of leads) {
    if (l.status !== "LOST") continue;
    const key = l.lostReason?.trim() || "Не указана";
    reasons.set(key, (reasons.get(key) ?? 0) + 1);
  }
  const reasonRows = [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  // ── Динамика по месяцам (последние 6, не зависит от периода)
  const leadsByMonth = new Map<string, number>();
  for (const l of recentLeads) {
    const k = monthKey(l.receivedAt);
    leadsByMonth.set(k, (leadsByMonth.get(k) ?? 0) + 1);
  }
  const clientsByMonth = new Map<string, number>();
  for (const c of recentClients) {
    const k = monthKey(c.startDate);
    clientsByMonth.set(k, (clientsByMonth.get(k) ?? 0) + 1);
  }
  const maxMonth = Math.max(
    1,
    ...monthKeys.map((k) => Math.max(leadsByMonth.get(k) ?? 0, clientsByMonth.get(k) ?? 0)),
  );

  const summary = [
    { label: "Заявок за период", value: String(total) },
    { label: "Стали клиентами", value: String(won) },
    { label: "Конверсия", value: `${pct(won, total)}%` },
    { label: "Потеряно", value: String(lost) },
    { label: "MRR сейчас", value: formatRub(mrr) },
    { label: "Средний чек", value: avgFee ? formatRub(avgFee) : "—" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Аналитика</h1>
        <p className="mt-1 text-slate-500">Откуда приходят клиенты и что приносит деньги</p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/analytics?period=${p.key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              p.key === current.key
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {summary.map((s) => (
          <div key={s.label} className={cardCls}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="mt-1 text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-medium text-slate-500">
          Эффективность источников
        </h2>
        {sourceRows.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">За выбранный период заявок нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Источник</th>
                  <th className="pb-2 text-right font-medium">Заявок</th>
                  <th className="pb-2 text-right font-medium">Клиентов</th>
                  <th className="pb-2 text-right font-medium">Конверсия</th>
                  <th className="pb-2 text-right font-medium">Потеряно</th>
                  <th className="pb-2 text-right font-medium">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sourceRows.map(([source, r]) => (
                  <tr key={source}>
                    <td className="py-2 font-medium">{SOURCE_LABEL[source]}</td>
                    <td className="py-2 text-right">{r.total}</td>
                    <td className="py-2 text-right">{r.won}</td>
                    <td className="py-2 text-right">{pct(r.won, r.total)}%</td>
                    <td className="py-2 text-right">{r.lost}</td>
                    <td className="py-2 text-right">{formatRub(r.mrr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Расходы на рекламу пока не учитываются, поэтому стоимость заявки и
          окупаемость не считаются.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-medium text-slate-500">
            Воронка: где сейчас заявки
          </h2>
          <ul className="space-y-2">
            {LEAD_STATUSES.map((s) => {
              const n = byStatus.get(s) ?? 0;
              return (
                <li key={s}>
                  <div className="mb-0.5 flex justify-between text-sm">
                    <span>{LEAD_STATUS_LABEL[s]}</span>
                    <span className="text-slate-500">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(n / maxStatus) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-medium text-slate-500">Причины потерь</h2>
          {reasonRows.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Потерянных заявок нет.</p>
          ) : (
            <ul className="space-y-2">
              {reasonRows.map(([reason, n]) => (
                <li key={reason} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{reason}</span>
                  <span className="shrink-0 text-slate-500">
                    {n} · {pct(n, lost)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={cardCls}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-slate-500">
            Динамика за 6 месяцев
          </h2>
          <div className="flex gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500" /> заявки
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> новые клиенты
            </span>
          </div>
        </div>

        <div className="flex h-40 items-end gap-2 sm:gap-4">
          {monthKeys.map((k) => {
            const l = leadsByMonth.get(k) ?? 0;
            const c = clientsByMonth.get(k) ?? 0;
            return (
              <div key={k} className="flex h-full flex-1 flex-col justify-end">
                <div className="flex flex-1 items-end justify-center gap-1">
                  <div
                    className="flex w-full max-w-6 flex-col items-center justify-end"
                    style={{ height: `${(l / maxMonth) * 100}%` }}
                    title={`Заявок: ${l}`}
                  >
                    <span className="mb-0.5 text-[10px] text-slate-500">{l || ""}</span>
                    <div className="w-full flex-1 rounded-t bg-indigo-500" />
                  </div>
                  <div
                    className="flex w-full max-w-6 flex-col items-center justify-end"
                    style={{ height: `${(c / maxMonth) * 100}%` }}
                    title={`Новых клиентов: ${c}`}
                  >
                    <span className="mb-0.5 text-[10px] text-slate-500">{c || ""}</span>
                    <div className="w-full flex-1 rounded-t bg-emerald-500" />
                  </div>
                </div>
                <p className="mt-1 text-center text-xs text-slate-500">{monthShort(k)}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
