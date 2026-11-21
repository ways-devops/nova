"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TASK_PRIORITY_BADGE, TASK_PRIORITY_LABEL } from "@/lib/labels";
import {
  deleteTaskAction,
  postponeTaskAction,
  setTaskDoneAction,
} from "@/features/tasks/actions";
import type { ActionResult } from "@/features/leads/types";
import type { TaskView } from "@/features/tasks/types";

export function TaskItem({ task }: { task: TaskView }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const done = task.status === "DONE";

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  const link = task.leadId
    ? { href: `/leads/${task.leadId}`, name: task.leadName }
    : task.clientId
      ? { href: `/clients/${task.clientId}`, name: task.clientName }
      : null;

  return (
    <li
      className={`rounded-xl border bg-white p-3 ${
        task.overdue ? "border-rose-300" : "border-slate-200"
      } ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          disabled={pending}
          onChange={(e) => run(() => setTaskDoneAction(task.id, e.target.checked))}
          aria-label={done ? "Вернуть в работу" : "Отметить выполненной"}
          className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300"
        />

        <div className="min-w-0 flex-1">
          <p className={`font-medium ${done ? "text-slate-400 line-through" : ""}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-500">
              {task.description}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className={task.overdue ? "font-medium text-rose-600" : "text-slate-500"}>
              {task.overdue ? "Просрочено · " : ""}
              {task.dueLabel}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${TASK_PRIORITY_BADGE[task.priority]}`}
            >
              {TASK_PRIORITY_LABEL[task.priority]}
            </span>
            {link?.name && (
              <Link href={link.href} className="text-indigo-600 hover:underline">
                {link.name}
              </Link>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
          {!done && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => postponeTaskAction(task.id, 1))}
              className="text-slate-500 hover:text-slate-800"
            >
              +1 день
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Удалить задачу?")) {
                run(() => deleteTaskAction(task.id));
              }
            }}
            className="text-slate-400 hover:text-rose-600"
          >
            Удалить
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}
