import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { SourceChart } from "@/components/dashboard/SourceChart";
import { StatusBadge } from "@/components/leads/StatusBadge";
import { TaskItem } from "@/components/tasks/TaskItem";
import { cardCls } from "@/components/ui/styles";
import { toTaskView } from "@/features/tasks/view";
import { GOAL_CLIENTS, GOAL_MRR } from "@/lib/goals";
import { SOURCE_LABEL } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/utils/date";
import { formatRub } from "@/lib/utils/format";
import { formatPhone } from "@/lib/utils/phone";

export const metadata = { title: "Главная" };
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  await requireUser();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const monthAgo = new Date(now.getTime() - 30 * DAY);
  const base = { mergedIntoId: null } as const;

  const [
    total,
    newWeek,
    newMonth,
    active,
    won,
    lost,
    mrr,
    activeClients,
    overdueCount,
    recentLeads,
    upcomingTasks,
    activities,
    bySource,
  ] = await Promise.all([
    prisma.lead.count({ where: base }),
    prisma.lead.count({ where: { ...base, receivedAt: { gte: weekAgo } } }),
    prisma.lead.count({ where: { ...base, receivedAt: { gte: monthAgo } } }),
    prisma.lead.count({
      where: {
        ...base,
        status: { in: ["CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION"] },
      },
    }),
    prisma.lead.count({ where: { ...base, status: "WON" } }),
    prisma.lead.count({ where: { ...base, status: "LOST" } }),
    prisma.client.aggregate({
      where: { contractStatus: "ACTIVE" },
      _sum: { monthlyFee: true },
    }),
    prisma.client.count({ where: { contractStatus: "ACTIVE" } }),
    prisma.task.count({ where: { status: "TODO", dueAt: { lt: now } } }),
    prisma.lead.findMany({
      where: base,
      orderBy: { receivedAt: "desc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: { status: "TODO" },
      orderBy: { dueAt: "asc" },
      take: 5,
      include: {
        lead: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        lead: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.lead.groupBy({
      by: ["source"],
      where: base,
      _count: { _all: true },
    }),
  ]);

  const mrrValue = mrr._sum.monthlyFee ?? 0;
  const conversion = total > 0 ? Math.round((won / total) * 100) : 0;
  const tasks = upcomingTasks.map((t) => toTaskView(t, now));

  const cards = [
    { label: "Всего заявок", value: String(total), href: "/leads" },
    { label: "Новые за неделю", value: String(newWeek), href: "/leads" },
    { label: "Новые за месяц", value: String(newMonth), href: "/leads" },
    { label: "Активные переговоры", value: String(active), href: "/pipeline" },
    { label: "Заключённые договоры", value: String(won), href: "/clients" },
    { label: "Потерянные", value: String(lost), href: "/leads?status=LOST" },
    { label: "MRR", value: formatRub(mrrValue), href: "/clients" },
    { label: "Конверсия", value: `${conversion}%`, href: "/analytics" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Главная</h1>
        <p className="mt-1 text-slate-500">Состояние бизнеса на сегодня</p>
      </div>

      {overdueCount > 0 && (
        <Link
          href="/tasks"
          className="block rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          Просроченных задач: {overdueCount}. Открыть список →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`${cardCls} transition hover:border-indigo-300`}
          >
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </Link>
        ))}
      </div>

      <section className={cardCls}>
        <h2 className="mb-4 text-sm font-medium text-slate-500">
          Цель: {GOAL_CLIENTS} постоянных клиентов
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ProgressBar
            label="Клиенты"
            value={activeClients}
            goal={GOAL_CLIENTS}
            valueLabel={`${activeClients} из ${GOAL_CLIENTS}`}
          />
          <ProgressBar
            label="Регулярная выручка (MRR)"
            value={mrrValue}
            goal={GOAL_MRR}
            valueLabel={`${formatRub(mrrValue)} из ${formatRub(GOAL_MRR)}`}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardCls}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-500">Последние обращения</h2>
            <Link href="/leads" className="text-xs text-indigo-600 hover:underline">
              Все заявки
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Заявок пока нет.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/leads/${l.id}`}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[
                          l.phone ? formatPhone(l.phone) : null,
                          SOURCE_LABEL[l.source],
                          formatDate(l.receivedAt),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <StatusBadge status={l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cardCls}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-500">Ближайшие задачи</h2>
            <Link href="/tasks" className="text-xs text-indigo-600 hover:underline">
              Все задачи
            </Link>
          </div>
          {tasks.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Активных задач нет.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardCls}>
          <h2 className="mb-4 text-sm font-medium text-slate-500">Источники заявок</h2>
          <SourceChart
            data={bySource.map((s) => ({
              label: SOURCE_LABEL[s.source],
              count: s._count._all,
            }))}
          />
        </section>

        <section className={cardCls}>
          <h2 className="mb-3 text-sm font-medium text-slate-500">Последние действия</h2>
          {activities.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Событий пока нет.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => {
                const target = a.lead
                  ? { href: `/leads/${a.lead.id}`, name: a.lead.name }
                  : a.client
                    ? { href: `/clients/${a.client.id}`, name: a.client.name }
                    : null;
                return (
                  <li key={a.id} className="border-l-2 border-slate-200 pl-3">
                    <p className="line-clamp-2 whitespace-pre-wrap text-sm">
                      {a.message}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(a.createdAt)}
                      {target && (
                        <>
                          {" · "}
                          <Link href={target.href} className="text-indigo-600 hover:underline">
                            {target.name}
                          </Link>
                        </>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
