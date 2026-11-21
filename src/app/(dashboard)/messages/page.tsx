import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { cardCls } from "@/components/ui/styles";
import { isAvitoConfigured } from "@/features/avito/client";
import { formatDateTime } from "@/lib/utils/date";

export const metadata = { title: "Сообщения" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  await requireUser();

  const conversations = await prisma.conversation.findMany({
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    take: 100,
    include: { lead: { select: { id: true, name: true, company: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Сообщения</h1>
      <p className="mt-1 text-slate-500">Диалоги с клиентами из Авито</p>

      <div className="mt-5 space-y-2">
        {conversations.length === 0 ? (
          <div className={`${cardCls} border-dashed py-10 text-center text-sm text-slate-500`}>
            {isAvitoConfigured() ? (
              "Диалогов пока нет. Они появятся, когда клиенты напишут на Авито."
            ) : (
              <>
                Авито ещё не подключён.{" "}
                <Link href="/settings" className="text-indigo-600 hover:underline">
                  Открыть настройки интеграций
                </Link>
              </>
            )}
          </div>
        ) : (
          conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className={`${cardCls} block transition hover:border-indigo-300`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`truncate ${c.unread > 0 ? "font-semibold" : "font-medium"}`}>
                    {c.lead.name}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {c.lastMessagePreview ?? "Нет сообщений"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {c.unread > 0 && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                      {c.unread}
                    </span>
                  )}
                  {c.lastMessageAt && (
                    <span className="text-xs text-slate-400">
                      {formatDateTime(c.lastMessageAt)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
