import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { StatusBadge } from "@/components/leads/StatusBadge";
import { btnPrimary, btnSecondary, cardCls, inputCls } from "@/components/ui/styles";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  SOURCE_LABEL,
} from "@/lib/labels";
import { formatDate } from "@/lib/utils/date";
import { formatRub } from "@/lib/utils/format";
import { formatPhone, phoneSearchDigits } from "@/lib/utils/phone";

export const metadata = { title: "Заявки" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string; source?: string }>;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();
  const { q = "", status = "", source = "" } = await searchParams;
  const query = q.trim();

  const where: Prisma.LeadWhereInput = { mergedIntoId: null };

  const statusValue = LEAD_STATUSES.find((s) => s === status);
  if (statusValue) where.status = statusValue;

  const sourceValue = LEAD_SOURCES.find((s) => s === source);
  if (sourceValue) where.source = sourceValue;

  if (query) {
    const or: Prisma.LeadWhereInput[] = [
      { name: { contains: query, mode: "insensitive" } },
      { company: { contains: query, mode: "insensitive" } },
      { city: { contains: query, mode: "insensitive" } },
      { comment: { contains: query, mode: "insensitive" } },
      { phone: { contains: query } },
    ];
    const digits = phoneSearchDigits(query);
    if (digits) or.push({ phone: { contains: digits } });
    where.OR = or;
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
    prisma.lead.count({ where }),
  ]);

  const filtered = Boolean(query || statusValue || sourceValue);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Заявки</h1>
          <p className="mt-1 text-slate-500">Найдено: {total}</p>
        </div>
        <Link href="/leads/new" className={btnPrimary}>
          + Новая заявка
        </Link>
      </div>

      <form method="get" className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Поиск по имени, телефону, компании…"
          className={inputCls}
        />
        <select name="status" defaultValue={statusValue ?? ""} className={inputCls}>
          <option value="">Все статусы</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select name="source" defaultValue={sourceValue ?? ""} className={inputCls}>
          <option value="">Все источники</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABEL[s]}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="submit" className={btnPrimary}>
            Найти
          </button>
          {filtered && (
            <Link href="/leads" className={btnSecondary}>
              Сбросить
            </Link>
          )}
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {leads.length === 0 ? (
          <div className={`${cardCls} border-dashed py-10 text-center text-sm text-slate-500`}>
            {filtered
              ? "По вашему запросу ничего не найдено."
              : "Заявок пока нет. Создайте первую."}
          </div>
        ) : (
          leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className={`${cardCls} block transition hover:border-indigo-300`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{lead.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[lead.company, lead.city].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <StatusBadge status={lead.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {lead.phone && <span>{formatPhone(lead.phone)}</span>}
                <span>{SOURCE_LABEL[lead.source]}</span>
                {lead.budget != null && <span>{formatRub(lead.budget)}/мес</span>}
                <span>{formatDate(lead.receivedAt)}</span>
              </div>
            </Link>
          ))
        )}
        {total > leads.length && (
          <p className="pt-2 text-center text-xs text-slate-400">
            Показаны первые {leads.length} из {total}. Уточните поиск.
          </p>
        )}
      </div>
    </div>
  );
}
