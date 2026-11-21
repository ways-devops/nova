export async function register() {
  // Планировщик нужен только в Node.js-окружении (не в Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startScheduler } = await import("@/features/scheduler");
  startScheduler();
}
