import type { Task } from "@prisma/client";
import { formatDateTime } from "@/lib/utils/date";
import type { TaskView } from "./types";

type TaskWithLinks = Task & {
  lead?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
};

export function toTaskView(t: TaskWithLinks, now: Date = new Date()): TaskView {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    dueLabel: formatDateTime(t.dueAt),
    overdue: t.status === "TODO" && t.dueAt.getTime() < now.getTime(),
    priority: t.priority,
    status: t.status,
    leadId: t.lead?.id ?? t.leadId,
    leadName: t.lead?.name ?? null,
    clientId: t.client?.id ?? t.clientId,
    clientName: t.client?.name ?? null,
  };
}
