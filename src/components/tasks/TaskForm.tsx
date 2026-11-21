"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field } from "@/components/ui/Field";
import { btnPrimary, inputCls } from "@/components/ui/styles";
import { TASK_PRIORITIES, TASK_PRIORITY_LABEL } from "@/lib/labels";
import { createTaskAction } from "@/features/tasks/actions";
import type { FormState } from "@/features/leads/types";

export type LinkOption = {
  value: string; // "lead:<id>" | "client:<id>"
  label: string;
  group: "Заявки" | "Клиенты";
};

export function TaskForm({
  defaultDue,
  fixedLink,
  options,
}: {
  defaultDue: string;
  /** Если задача создаётся из карточки — связь зафиксирована. */
  fixedLink?: string;
  /** Иначе показываем выбор связанного клиента. */
  options?: LinkOption[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createTaskAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state]);

  const leadOptions = options?.filter((o) => o.group === "Заявки") ?? [];
  const clientOptions = options?.filter((o) => o.group === "Клиенты") ?? [];

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Задача *" htmlFor="task-title" className="md:col-span-2">
          <input
            id="task-title"
            name="title"
            placeholder="Например: позвонить, отправить коммерческое предложение"
            className={inputCls}
            required
            maxLength={200}
          />
        </Field>

        <Field label="Срок *" htmlFor="task-due">
          <input
            id="task-due"
            name="dueAt"
            type="datetime-local"
            defaultValue={defaultDue}
            className={inputCls}
            required
          />
        </Field>

        <Field label="Приоритет" htmlFor="task-priority">
          <select
            id="task-priority"
            name="priority"
            defaultValue="MEDIUM"
            className={inputCls}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>

        {fixedLink ? (
          <input type="hidden" name="link" value={fixedLink} />
        ) : (
          <Field label="Связанный клиент" htmlFor="task-link" className="md:col-span-2">
            <select id="task-link" name="link" defaultValue="" className={inputCls}>
              <option value="">Без привязки</option>
              {leadOptions.length > 0 && (
                <optgroup label="Заявки">
                  {leadOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {clientOptions.length > 0 && (
                <optgroup label="Клиенты">
                  {clientOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>
        )}

        <Field label="Подробности" htmlFor="task-desc" className="md:col-span-2">
          <textarea
            id="task-desc"
            name="description"
            rows={2}
            className={inputCls}
            maxLength={2000}
          />
        </Field>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Задача добавлена
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Добавляем…" : "Добавить задачу"}
      </button>
    </form>
  );
}
