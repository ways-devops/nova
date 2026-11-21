import { processTaskReminders } from "@/features/tasks/reminders";
import { isAvitoConfigured } from "@/features/avito/client";
import { syncAvito } from "@/features/avito/sync";

const TICK_MS = 60_000;

function logError(scope: string, e: unknown) {
  console.error(`[scheduler] ${scope}:`, e instanceof Error ? e.message : e);
}

/** Встроенный планировщик: один процесс Next.js — один таймер. */
export function startScheduler() {
  const g = globalThis as unknown as { __novaScheduler?: boolean };
  if (g.__novaScheduler) return;
  g.__novaScheduler = true;

  let tick = 0;
  const run = async () => {
    tick += 1;
    try {
      await processTaskReminders();
    } catch (e) {
      logError("напоминания", e);
    }
    // Синхронизация Авито — каждую вторую минуту
    if (tick % 2 === 0 && isAvitoConfigured()) {
      try {
        await syncAvito();
      } catch (e) {
        logError("синхронизация Авито", e);
      }
    }
  };

  const timer = setInterval(run, TICK_MS);
  (timer as unknown as { unref?: () => void }).unref?.();
  setTimeout(run, 15_000); // первый запуск вскоре после старта

  console.log("[scheduler] запущен: напоминания — каждую минуту, Авито — каждые 2 минуты");
}
