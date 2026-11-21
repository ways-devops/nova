import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadStatusControl } from "@/components/leads/LeadStatusControl";
import { MergeButton } from "@/components/leads/MergeButton";
import { NoteForm } from "@/components/leads/NoteForm";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { StatusBadge } from "@/components/leads/StatusBadge";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskItem } from "@/components/tasks/TaskItem";
import { cardCls } from "@/components/ui/styles";
import { deleteLeadAction, updateLeadAction } from "@/features/leads/actions";
import { toTaskView } from "@/features/tasks/view";
import { SOURCE_LABEL } from "@/lib/labels";
import {
  formatDate,
  formatDateTime,
  toInputDate,
} from "@/lib/utils/date";
import { formatPhone } from "@/lib/utils/phone";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Карточка заявки" };
}

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      client: { select: { id: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!lead) notFound();
  // Объединённый дубликат ведёт на основную заявку
  if (lead.mergedIntoId) redirect(`/leads/${lead.mergedIntoId}`);

  const duplicates = lead.phone
    ? await prisma.lead.findMany({
        where: { id: { not: lead.id }, mergedIntoId: null, phone: lead.phone },
        select: {
          id: true,
          name: true,
          company: true,
          status: true,
          receivedAt: true,
          client: { select: { id: true } },
        },
        orderBy: { receivedAt: "desc" },
      })
    : [];

  const taskRows = await prisma.task.findMany({
    where: { leadId: lead.id },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 30,
  });
  const now = new Date();
  const tasks = taskRows.map((t) => toTaskView(t, now));
  const defaultDue = `${toInputDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))}T10:00`;

  const updateAction = updateLeadAction.bind(null, lead.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-700">
          ← К заявкам
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{lead.name}</h1>
          <StatusBadge status={lead.status} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {[
            lead.phone ? formatPhone(lead.phone) : null,
            SOURCE_LABEL[lead.source],
            `обращение ${formatDate(lead.receivedAt)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-medium text-slate-500">Этап воронки</h2>
        <LeadStatusControl
          leadId={lead.id}
          leadName={lead.name}
          status={lead.status}
          budget={lead.budget}
          clientId={lead.client?.id ?? null}
        />
        {lead.status === "LOST" && lead.lostReason && (
          <p className="mt-3 text-sm text-rose-700">
            Причина потери: {lead.lostReason}
          </p>
        )}
      </section>

      {duplicates.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-medium text-amber-800">
            Повторные заявки с этим номером
          </h2>
          <ul className="mt-3 space-y-3">
            {duplicates.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0 text-sm">
                  <Link
                    href={`/leads/${d.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {d.name}
                  </Link>
                  <span className="ml-2 text-slate-500">
                    {d.company ? `${d.company} · ` : ""}
                    {formatDate(d.receivedAt)}
                  </span>
                </div>
                {d.client ? (
                  <span className="text-xs text-slate-500">
                    уже клиент — объединить нельзя
                  </span>
                ) : (
                  <MergeButton primaryId={lead.id} duplicateId={d.id} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-medium text-slate-500">Данные заявки</h2>
        <LeadForm
          action={updateAction}
          defaults={{
            name: lead.name,
            phone: lead.phone,
            company: lead.company,
            businessType: lead.businessType,
            city: lead.city,
            source: lead.source,
            service: lead.service,
            budget: lead.budget,
            comment: lead.comment,
            receivedAt: toInputDate(lead.receivedAt),
          }}
          submitLabel="Сохранить"
        />
      </section>

      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-medium text-slate-500">Задачи</h2>
        {tasks.length > 0 && (
          <ul className="mb-4 space-y-2">
            {tasks.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </ul>
        )}
        <TaskForm defaultDue={defaultDue} fixedLink={`lead:${lead.id}`} />
      </section>

      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-medium text-slate-500">Заметка</h2>
        <NoteForm leadId={lead.id} />
      </section>

      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-medium text-slate-500">История</h2>
        {lead.activities.length === 0 ? (
          <p className="text-sm text-slate-500">Событий пока нет.</p>
        ) : (
          <ul className="space-y-3">
            {lead.activities.map((a) => (
              <li key={a.id} className="border-l-2 border-slate-200 pl-3">
                <p className="whitespace-pre-wrap text-sm">{a.message}</p>
                <p className="text-xs text-slate-400">{formatDateTime(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-rose-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-medium text-rose-700">Удаление заявки</h2>
        <p className="mb-3 text-sm text-slate-500">
          Заявка будет удалена вместе с историей, задачами и перепиской.
          {lead.client && " Клиент останется в разделе «Клиенты»."}
        </p>
        <DeleteButton
          label="Удалить заявку"
          confirmText={`Удалить заявку «${lead.name}» вместе с историей, задачами и перепиской? Это нельзя отменить.${
            lead.client ? " Клиент останется в разделе «Клиенты»." : ""
          }`}
          action={deleteLeadAction.bind(null, lead.id)}
          redirectTo="/leads"
        />
      </section>
    </div>
  );
}
