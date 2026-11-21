import type { TaskPriority, TaskStatus } from "@prisma/client";

/** Задача в виде, пригодном для передачи в клиентские компоненты. */
export type TaskView = {
  id: string;
  title: string;
  description: string | null;
  dueLabel: string;
  overdue: boolean;
  priority: TaskPriority;
  status: TaskStatus;
  leadId: string | null;
  leadName: string | null;
  clientId: string | null;
  clientName: string | null;
};
