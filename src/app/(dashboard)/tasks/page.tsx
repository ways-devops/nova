import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { TaskForm, type LinkOption } from "@/components/tasks/TaskForm";
import { TaskItem } from "@/components/tasks/TaskItem";
import { cardCls } from "@/components/ui/styles";
import { toTaskView } from "@/features/tasks/view";
import type { TaskView } from "@/features/tasks/types";
import { toInputDate, toInputDateTime } from "@/lib/utils/date";

export const metadata = { title: "Задачи" };
export const dynamic = "force-dynamic";

function Group({ title, tasks }: { title: string; tasks: TaskView[] }) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-slate-500">
        {title} · {tasks.length}
      </h2>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <TaskItem key={t.id} task={t} />
        ))}
      </ul>
    </section>
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireUser();
  const { view } = await searchParams;
  const showDone = view === "done";

  const now = new Date();
  const include = {
    lead: { select: { id: true, name: true } },
    client: { select: { id: true, name: true } },
  } as const;

  const [rows, leads, clients, openCount, doneCount] = await Promise.all([
    prisma.task.findMany({
      where: { status: showDone ? "DONE" : "TODO" },
      orderBy: showDone ? { completedAt: "desc" } : { dueAt: "asc" },
      take: 200,
      include,
    }),
    prisma.lead.findMany({
      where: { mergedIntoId: null, status: { not: "LOST" } },
      orderBy: { receivedAt: "desc" },
      take: 200,
      select: { id: true, name: true, company: true },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.task.count({ where: { status: "TODO" } }),
    prisma.task.count({ where: { status: "DONE" } }),
  ]);

  const tasks = rows.map((t) => toTaskView(t, now));

  const options: LinkOption[] = [
    ...leads.map((l) => ({
      value: `lead:${l.id}`,
      label: l.company ? `${l.name} · ${l.company}` : l.name,
      group: "Заявки" as const,
    })),
    ...clients.map((c) => ({
      value: `client:${c.id}`,
      label: c.name,
      group: "Клиенты" as const,
    })),
  ];

  // Срок по умолчанию: завтра в 10:00 по Москве
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const defaultDue = `${toInputDate(tomorrow)}T10:00`;

  // Группы для открытых задач
  const todayStr = toInputDate(now);
  const overdue: TaskView[] = [];
  const today: TaskView[] = [];
  const upcoming: TaskView[] = [];
  if (!showDone) {
    rows.forEach((row, i) => {
      const view = tasks[i];
      if (view.overdue) overdue.push(view);
      else if (toInputDateTime(row.dueAt).slice(0, 10) === todayStr) today.push(view);
      else upcoming.push(view);
    });
  }

  const tabCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Задачи</h1>
        <p className="mt-1 text-slate-500">Напоминания и повторные контакты</p>
      </div>

      <details className={cardCls} open={!showDone && tasks.length === 0}>
        <summary className="cursor-pointer text-sm font-medium text-indigo-600">
          + Новая задача
        </summary>
        <div className="mt-4">
          <TaskForm defaultDue={defaultDue} options={options} />
        </div>
      </details>

      <nav className="flex gap-2">
        <Link href="/tasks" className={tabCls(!showDone)}>
          Активные · {openCount}
        </Link>
        <Link href="/tasks?view=done" className={tabCls(showDone)}>
          Выполненные · {doneCount}
        </Link>
      </nav>

      {tasks.length === 0 ? (
        <div className={`${cardCls} border-dashed py-10 text-center text-sm text-slate-500`}>
          {showDone ? "Выполненных задач пока нет." : "Активных задач нет. Добавьте первую."}
        </div>
      ) : showDone ? (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </ul>
      ) : (
        <div className="space-y-5">
          <Group title="Просрочено" tasks={overdue} />
          <Group title="Сегодня" tasks={today} />
          <Group title="Позже" tasks={upcoming} />
        </div>
      )}

      <p className="text-xs text-slate-400">
        Напоминания в Telegram появятся на этапе 4.
      </p>
    </div>
  );
}
