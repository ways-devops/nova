import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/auth/safe-equal";
import { processTaskReminders } from "@/features/tasks/reminders";
import { syncAvito } from "@/features/avito/sync";

export const dynamic = "force-dynamic";

/**
 * Запасной способ запуска фоновых задач из внешнего cron:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://ваш-домен/api/cron/reminders
 * Обычно не нужен: встроенный планировщик (instrumentation.ts) делает то же самое.
 */
async function handler(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || !token || !safeEqual(token, secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reminders = await processTaskReminders();
  let avito: { chats: number; newMessages: number } | { error: string } | null = null;
  try {
    const r = await syncAvito();
    avito = r.skipped ? null : r;
  } catch (e) {
    avito = { error: e instanceof Error ? e.message : "Ошибка синхронизации" };
  }
  return NextResponse.json({ ok: true, reminders, avito });
}

export const POST = handler;
export const GET = handler;
