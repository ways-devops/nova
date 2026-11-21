import { prisma } from "@/lib/db/prisma";
import { isTelegramConfigured } from "@/lib/telegram";
import { sendTaskReminder } from "@/features/notifications/notify";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Отправляет в Telegram напоминания по задачам, срок которых наступил.
 * Защита от дублей: задача «занимается» (notifiedAt) до отправки, при сбое
 * Telegram отметка снимается, и попытка повторится на следующем тике.
 * Задачи, просроченные больше чем на сутки, не напоминаем — они уже видны в CRM.
 */
export async function processTaskReminders(now: Date = new Date()): Promise<{ sent: number }> {
  if (!isTelegramConfigured()) return { sent: 0 };

  const due = await prisma.task.findMany({
    where: {
      status: "TODO",
      notifiedAt: null,
      dueAt: { lte: now, gte: new Date(now.getTime() - DAY) },
    },
    orderBy: { dueAt: "asc" },
    take: 20,
    include: {
      lead: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });

  let sent = 0;
  for (const task of due) {
    const claim = await prisma.task.updateMany({
      where: { id: task.id, notifiedAt: null },
      data: { notifiedAt: now },
    });
    if (claim.count === 0) continue; // другой процесс уже взял

    const target = task.lead ?? task.client;
    const link = task.lead
      ? `/leads/${task.lead.id}`
      : task.client
        ? `/clients/${task.client.id}`
        : "/tasks";

    const result = await sendTaskReminder({
      title: task.title,
      dueAt: task.dueAt,
      description: task.description,
      targetName: target?.name,
      link,
    });

    if (result.ok) {
      sent += 1;
    } else {
      await prisma.task.update({ where: { id: task.id }, data: { notifiedAt: null } });
      break; // Telegram недоступен — не долбим остальные, повторим на следующем тике
    }
  }
  return { sent };
}
