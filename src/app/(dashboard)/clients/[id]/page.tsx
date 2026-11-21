import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { ClientForm } from "@/components/clients/ClientForm";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskItem } from "@/components/tasks/TaskItem";
import { cardCls } from "@/components/ui/styles";
import { deleteClientAction, updateClientAction } from "@/features/clients/actions";
import { toTaskView } from "@/features/tasks/view";
import { formatDate, formatDateTime, toInputDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Карточка клиента" };
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, name: true, receivedAt: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!client) notFound();

  const taskRows = await prisma.task.findMany({
    where: { clientId: client.id },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 30,
  });
  const now = new Date();
  const tasks = taskRows.map((t) => toTaskView(t, now));
  const defaultDue = `${toInputDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))}T10:00`;

  const action = updateClientAction.bind(null, client.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/clients" className="text-sm text-slate-500 hover:text-slate-700">
          ← К клиентам
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{client.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Клиент с {formatDate(client.startDate)}
          {client.lead && (
            <>
              {" · "}
              <Link
                href={`/leads/${client.lead.id}`}
                className="text-indigo-600 hover:underline"
              >
                исходная заявка от {formatDate(client.lead.receivedAt)}
              </Link>
            </>
          )}
        </p>
      </div>

      <section className={cardCls}>
        <ClientForm
          action={action}
          values={{
            name: client.name,
            inn: client.inn,
            businessType: client.businessType,
            taxSystem: client.taxSystem,
            services: client.services,
            monthlyFee: client.monthlyFee,
            startDate: toInputDate(client.startDate),
            contractStatus: client.contractStatus,
            phone: client.phone,
            email: client.email,
            contactPerson: client.contactPerson,
            notes: client.notes,
          }}
        />
      </section>

      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-medium text-slate-500">
          Задачи и напоминания
        </h2>
        {tasks.length > 0 && (
          <ul className="mb-4 space-y-2">
            {tasks.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </ul>
        )}
        <TaskForm defaultDue={defaultDue} fixedLink={`client:${client.id}`} />
      </section>

      <section className={cardCls}>
        <h2 className="mb-3 text-sm font-medium text-slate-500">История</h2>
        {client.activities.length === 0 ? (
          <p className="text-sm text-slate-500">Событий пока нет.</p>
        ) : (
          <ul className="space-y-3">
            {client.activities.map((a) => (
              <li key={a.id} className="border-l-2 border-slate-200 pl-3">
                <p className="whitespace-pre-wrap text-sm">{a.message}</p>
                <p className="text-xs text-slate-400">{formatDateTime(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-rose-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-medium text-rose-700">Удаление клиента</h2>
        <p className="mb-3 text-sm text-slate-500">
          Будут удалены задачи и сделки клиента.
          {client.lead && " Исходная заявка вернётся в воронку на этап «Переговоры»."}
        </p>
        <DeleteButton
          label="Удалить клиента"
          confirmText={`Удалить клиента «${client.name}»? Задачи и сделки клиента будут удалены.${
            client.lead ? " Заявка вернётся в воронку на этап «Переговоры»." : ""
          } Это нельзя отменить.`}
          action={deleteClientAction.bind(null, client.id)}
          redirectTo="/clients"
        />
      </section>
    </div>
  );
}
