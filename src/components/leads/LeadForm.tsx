"use client";

import { useActionState } from "react";
import type {
  BusinessType,
  LeadSource,
  ServiceType,
} from "@prisma/client";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { formatPhone } from "@/lib/utils/phone";
import { btnPrimary, inputCls } from "@/components/ui/styles";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABEL,
  LEAD_SOURCES,
  SERVICES,
  SERVICE_LABEL,
  SOURCE_LABEL,
} from "@/lib/labels";
import type { FormState } from "@/features/leads/types";

export type LeadFormDefaults = {
  name?: string;
  phone?: string | null;
  company?: string | null;
  businessType?: BusinessType | null;
  city?: string | null;
  source?: LeadSource;
  service?: ServiceType | null;
  budget?: number | null;
  comment?: string | null;
  receivedAt?: string;
};

export function LeadForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: LeadFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Имя клиента *" htmlFor="name">
          <input
            id="name"
            name="name"
            defaultValue={defaults.name ?? ""}
            className={inputCls}
            required
            maxLength={200}
          />
        </Field>

        <Field label="Телефон" htmlFor="phone">
          <PhoneInput
            id="phone"
            name="phone"
            defaultValue={formatPhone(defaults.phone)}
          />
        </Field>

        <Field label="Название компании" htmlFor="company">
          <input
            id="company"
            name="company"
            defaultValue={defaults.company ?? ""}
            className={inputCls}
            maxLength={200}
          />
        </Field>

        <Field label="Тип бизнеса" htmlFor="businessType">
          <select
            id="businessType"
            name="businessType"
            defaultValue={defaults.businessType ?? ""}
            className={inputCls}
          >
            <option value="">—</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {BUSINESS_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Город" htmlFor="city">
          <input
            id="city"
            name="city"
            defaultValue={defaults.city ?? ""}
            className={inputCls}
            maxLength={100}
          />
        </Field>

        <Field label="Источник" htmlFor="source">
          <select
            id="source"
            name="source"
            defaultValue={defaults.source ?? "AVITO"}
            className={inputCls}
          >
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Услуга" htmlFor="service">
          <select
            id="service"
            name="service"
            defaultValue={defaults.service ?? ""}
            className={inputCls}
          >
            <option value="">—</option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Бюджет, ₽ в месяц" htmlFor="budget">
          <input
            id="budget"
            name="budget"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={defaults.budget ?? ""}
            className={inputCls}
          />
        </Field>

        <Field label="Дата обращения" htmlFor="receivedAt">
          <input
            id="receivedAt"
            name="receivedAt"
            type="date"
            defaultValue={defaults.receivedAt ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Комментарий" htmlFor="comment">
        <textarea
          id="comment"
          name="comment"
          rows={3}
          defaultValue={defaults.comment ?? ""}
          className={inputCls}
          maxLength={5000}
        />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Сохранено
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Сохраняем…" : submitLabel}
      </button>
    </form>
  );
}
