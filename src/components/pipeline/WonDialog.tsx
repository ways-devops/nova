"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { btnPrimary, btnSecondary, inputCls } from "@/components/ui/styles";
import { TAX_SYSTEMS, TAX_SYSTEM_LABEL } from "@/lib/labels";
import { toInputDate } from "@/lib/utils/date";
import { winLeadAction } from "@/features/leads/actions";

export function WonDialog({
  leadId,
  leadName,
  defaultFee,
  onClose,
  onDone,
}: {
  leadId: string;
  leadName: string;
  defaultFee?: number | null;
  onClose: () => void;
  onDone: (clientId?: string) => void;
}) {
  const [fee, setFee] = useState(defaultFee ? String(defaultFee) : "");
  const [startDate, setStartDate] = useState(toInputDate());
  const [taxSystem, setTaxSystem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await winLeadAction(leadId, {
        monthlyFee: fee,
        startDate,
        taxSystem,
      });
      if (result.ok) onDone(result.clientId);
      else setError(result.error);
    });
  }

  return (
    <Modal title="Новый постоянный клиент" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Для «{leadName}» будет создана карточка клиента. Укажите согласованную
          стоимость обслуживания.
        </p>

        <Field label="Стоимость в месяц, ₽" htmlFor="won-fee">
          <input
            id="won-fee"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className={inputCls}
            autoFocus
            required
          />
        </Field>

        <Field label="Начало обслуживания" htmlFor="won-start">
          <input
            id="won-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Система налогообложения (необязательно)" htmlFor="won-tax">
          <select
            id="won-tax"
            value={taxSystem}
            onChange={(e) => setTaxSystem(e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {TAX_SYSTEMS.map((t) => (
              <option key={t} value={t}>
                {TAX_SYSTEM_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>

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
            {pending ? "Создаём…" : "Создать клиента"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
