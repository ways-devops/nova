"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { btnPrimary, inputCls } from "@/components/ui/styles";
import {
  markConversationReadAction,
  sendAvitoMessageAction,
} from "@/features/avito/actions";
import type { FormState } from "@/features/leads/types";

const REFRESH_MS = 15_000;

export function ChatPanel({
  conversationId,
  unread,
}: {
  conversationId: string;
  unread: number;
}) {
  const router = useRouter();
  const action = sendAvitoMessageAction.bind(null, conversationId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Прокрутка к последнему сообщению и сброс счётчика непрочитанных
  useEffect(() => {
    document.getElementById("chat-end")?.scrollIntoView();
    if (unread > 0) void markConversationReadAction(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Автообновление, пока вкладка открыта
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  useEffect(() => {
    if (state.saved) {
      formRef.current?.reset();
      document.getElementById("chat-end")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <textarea
        name="text"
        rows={3}
        placeholder="Ответ клиенту…"
        className={inputCls}
        maxLength={1000}
        required
      />
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Отправляем…" : "Отправить в Авито"}
      </button>
    </form>
  );
}
