export const metadata = { title: "Нет соединения" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-xl font-semibold">Нет соединения</h1>
      <p className="max-w-xs text-slate-500">
        Для работы с заявками и клиентами нужен интернет. Проверьте подключение
        и обновите страницу.
      </p>
    </main>
  );
}
