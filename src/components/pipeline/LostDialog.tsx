"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { btnPrimary, btnSecondary, inputCls } from "@/components/ui/styles";
import { LOST_REASON_SUGGESTIONS } from "@/lib/labels";
import { markLostAction } from "@/features/leads/actions";

export function LostDialog({
  leadId,
  leadName,
  onClose,
  onDone,
}: {
  leadId: string;
  leadName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await markLostAction(leadId, reason);
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <Modal title="Причина потери клиента" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">
          «{leadName}» перейдёт в статус «Потеряна». Причину нужно указать
          обязательно — она пригодится для анализа.
        </p>

        <div className="flex flex-wrap gap-2">
          {LOST_REASON_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setReason(s)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              {s}
            </button>
          ))}
        </div>

        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Почему клиент потерян?"
          className={inputCls}
          autoFocus
          required
        />

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Отмена
          </button>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Сохраняем…" : "Перевести в «Потеряна»"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
