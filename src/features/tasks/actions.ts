"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/features/activity/log";
import { taskSchema } from "@/lib/validations/task";
import { firstError } from "@/lib/validations/common";
import { formatDateTime, parseInputDateTime } from "@/lib/utils/date";
import type { ActionResult, FormState } from "@/features/leads/types";

function revalidateTasks(leadId?: string | null, clientId?: string | null) {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (leadId) revalidatePath(`/leads/${leadId}`);
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

export async function createTaskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const dueAt = parseInputDateTime(d.dueAt);
  if (Number.isNaN(dueAt.getTime())) return { error: "Неверная дата" };

  let leadId: string | undefined;
  let clientId: string | undefined;
  if (d.link) {
    const [kind, id] = d.link.split(":");
    if (kind === "lead") {
      const lead = await prisma.lead.findUnique({
        where: { id },
        select: { id: true, mergedIntoId: true },
      });
      if (!lead || lead.mergedIntoId) return { error: "Заявка не найдена" };
      leadId = lead.id;
    } else {
      const client = await prisma.client.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!client) return { error: "Клиент не найден" };
      clientId = client.id;
    }
  }

  await prisma.task.create({
    data: {
      ownerId: user.id,
      title: d.title,
      description: d.description ?? null,
      dueAt,
      priority: d.priority,
      leadId,
      clientId,
    },
  });
  await logActivity(prisma, {
    userId: user.id,
    leadId,
    clientId,
    type: "TASK_CREATED",
    message: `Задача: ${d.title} (срок ${formatDateTime(dueAt)})`,
  });

  revalidateTasks(leadId, clientId);
  return { saved: true };
}

/** Отметить выполненной или вернуть в работу. */
export async function setTaskDoneAction(
  taskId: string,
  done: boolean,
): Promise<ActionResult> {
  const user = await requireUser();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Задача не найдена" };

  await prisma.task.update({
    where: { id: taskId },
    data: done
      ? { status: "DONE", completedAt: new Date() }
      : { status: "TODO", completedAt: null },
  });
  if (done) {
    await logActivity(prisma, {
      userId: user.id,
      leadId: task.leadId ?? undefined,
      clientId: task.clientId ?? undefined,
      type: "TASK_COMPLETED",
      message: `Задача выполнена: ${task.title}`,
    });
  }

  revalidateTasks(task.leadId, task.clientId);
  return { ok: true };
}

/** Перенести срок на N дней вперёд (от текущего срока, но не раньше «сейчас»). */
export async function postponeTaskAction(
  taskId: string,
  days: number,
): Promise<ActionResult> {
  await requireUser();

  if (!Number.isInteger(days) || days < 1 || days > 30) {
    return { ok: false, error: "Неверное количество дней" };
  }
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Задача не найдена" };

  const base = Math.max(task.dueAt.getTime(), Date.now());
  await prisma.task.update({
    where: { id: taskId },
    data: {
      dueAt: new Date(base + days * 24 * 60 * 60 * 1000),
      notifiedAt: null, // напоминание в Telegram (этап 4) должно сработать заново
    },
  });

  revalidateTasks(task.leadId, task.clientId);
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  await requireUser();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: true };

  await prisma.task.delete({ where: { id: taskId } });
  revalidateTasks(task.leadId, task.clientId);
  return { ok: true };
}
