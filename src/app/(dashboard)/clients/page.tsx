import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { cardCls } from "@/components/ui/styles";
import {
  CONTRACT_STATUS_LABEL,
  SERVICE_LABEL,
} from "@/lib/labels";
import { formatDate } from "@/lib/utils/date";
import { formatRub } from "@/lib/utils/format";

export const metadata = { title: "Клиенты" };
export const dynamic = "force-dynamic";

const CONTRACT_BADGE = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  TERMINATED: "bg-slate-200 text-slate-600",
} as const;

export default async function ClientsPage() {
  await requireUser();

  const clients = await prisma.client.findMany({
    orderBy: [{ contractStatus: "asc" }, { startDate: "desc" }],
  });

  const active = clients.filter((c) => c.contractStatus === "ACTIVE");
  const mrr = active.reduce((acc, c) => acc + c.monthlyFee, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Клиенты</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 md:max-w-md">
        <div className={cardCls}>
          <p className="text-xs text-slate-500">Действующих клиентов</p>
          <p className="mt-1 text-2xl font-semibold">{active.length}</p>
        </div>
        <div className={cardCls}>
          <p className="text-xs text-slate-500">MRR</p>
          <p className="mt-1 text-2xl font-semibold">{formatRub(mrr)}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {clients.length === 0 ? (
          <div className={`${cardCls} border-dashed py-10 text-center text-sm text-slate-500`}>
            Клиентов пока нет. Они появляются, когда заявка в воронке переходит
            в статус «Стал клиентом».
          </div>
        ) : (
          clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className={`${cardCls} block transition hover:border-indigo-300`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {c.services.map((s) => SERVICE_LABEL[s]).join(", ") || "Услуги не указаны"}
                  </p>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${CONTRACT_BADGE[c.contractStatus]}`}
                >
                  {CONTRACT_STATUS_LABEL[c.contractStatus]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-slate-500">
                <span>{formatRub(c.monthlyFee)}/мес</span>
                <span>с {formatDate(c.startDate)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
