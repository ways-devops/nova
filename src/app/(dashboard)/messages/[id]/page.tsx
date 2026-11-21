import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { cardCls } from "@/components/ui/styles";
import { formatDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Диалог" };
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, name: true, company: true } },
      messages: { orderBy: { sentAt: "desc" }, take: 200 },
    },
  });
  if (!conversation) notFound();

  const messages = [...conversation.messages].reverse();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href="/messages" className="text-sm text-slate-500 hover:text-slate-700">
          ← К сообщениям
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{conversation.lead.name}</h1>
        <Link
          href={`/leads/${conversation.lead.id}`}
          className="text-sm text-indigo-600 hover:underline"
        >
          Открыть карточку заявки
        </Link>
      </div>

      <section className={`${cardCls} space-y-3`}>
        {messages.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-500">Сообщений пока нет.</p>
        )}
        {messages.map((m) => {
          const out = m.direction === "OUTBOUND";
          const failed = m.deliveryStatus === "FAILED";
          return (
            <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  out ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900"
                } ${failed ? "ring-2 ring-red-400" : ""}`}
              >
                <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                <p className={`mt-1 text-[11px] ${out ? "text-indigo-200" : "text-slate-400"}`}>
                  {formatDateTime(m.sentAt)}
                  {m.deliveryStatus === "PENDING" && " · отправляется…"}
                  {failed && " · не отправлено"}
                </p>
              </div>
            </div>
          );
        })}
        <div id="chat-end" />
      </section>

      <section className={cardCls}>
        <ChatPanel conversationId={conversation.id} unread={conversation.unread} />
      </section>
    </div>
  );
}
