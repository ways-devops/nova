import type { ActivityType, Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/** Записывает событие в историю действий (используется и внутри транзакций). */
export async function logActivity(
  db: Db,
  entry: {
    userId?: string;
    leadId?: string;
    clientId?: string;
    type: ActivityType;
    message: string;
    meta?: Prisma.InputJsonValue;
  },
) {
  await db.activity.create({
    data: {
      userId: entry.userId,
      leadId: entry.leadId,
      clientId: entry.clientId,
      type: entry.type,
      message: entry.message,
      meta: entry.meta,
    },
  });
}
