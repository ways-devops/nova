"use client";

import { useActionState, useEffect, useRef } from "react";
import { btnSecondary, inputCls } from "@/components/ui/styles";
import { addNoteAction } from "@/features/leads/actions";
import type { FormState } from "@/features/leads/types";

export function NoteForm({ leadId }: { leadId: string }) {
  const action = addNoteAction.bind(null, leadId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <textarea
        name="text"
        rows={2}
        placeholder="Заметка: о чём договорились, что важно помнить…"
        className={inputCls}
        required
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={btnSecondary}>
        {pending ? "Добавляем…" : "Добавить заметку"}
      </button>
    </form>
  );
}
