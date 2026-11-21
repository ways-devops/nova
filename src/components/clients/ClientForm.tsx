"use client";

import { useActionState } from "react";
import type {
  BusinessType,
  ContractStatus,
  ServiceType,
  TaxSystem,
} from "@prisma/client";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { formatPhone } from "@/lib/utils/phone";
import { btnPrimary, inputCls } from "@/components/ui/styles";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABEL,
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABEL,
  SERVICES,
  SERVICE_LABEL,
  TAX_SYSTEMS,
  TAX_SYSTEM_LABEL,
} from "@/lib/labels";
import type { FormState } from "@/features/leads/types";

export type ClientFormValues = {
  name: string;
  inn: string | null;
  businessType: BusinessType | null;
  taxSystem: TaxSystem | null;
  services: ServiceType[];
  monthlyFee: number;
  startDate: string;
  contractStatus: ContractStatus;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  notes: string | null;
};

export function ClientForm({
  action,
  values,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values: ClientFormValues;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Имя / организация *" htmlFor="name" className="md:col-span-2">
          <input
            id="name"
            name="name"
            defaultValue={values.name}
            className={inputCls}
            required
            maxLength={200}
          />
        </Field>

        <Field label="ИНН" htmlFor="inn">
          <input
            id="inn"
            name="inn"
            inputMode="numeric"
            defaultValue={values.inn ?? ""}
            className={inputCls}
            maxLength={12}
          />
        </Field>

        <Field label="ИП или ООО" htmlFor="businessType">
          <select
            id="businessType"
            name="businessType"
            defaultValue={values.businessType ?? ""}
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

        <Field label="Система налогообложения" htmlFor="taxSystem">
          <select
            id="taxSystem"
            name="taxSystem"
            defaultValue={values.taxSystem ?? ""}
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

        <Field label="Статус договора" htmlFor="contractStatus">
          <select
            id="contractStatus"
            name="contractStatus"
            defaultValue={values.contractStatus}
            className={inputCls}
          >
            {CONTRACT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CONTRACT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Стоимость в месяц, ₽ *" htmlFor="monthlyFee">
          <input
            id="monthlyFee"
            name="monthlyFee"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            defaultValue={values.monthlyFee}
            className={inputCls}
            required
          />
        </Field>

        <Field label="Дата начала обслуживания *" htmlFor="startDate">
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={values.startDate}
            className={inputCls}
            required
          />
        </Field>

        <Field label="Контактное лицо" htmlFor="contactPerson">
          <input
            id="contactPerson"
            name="contactPerson"
            defaultValue={values.contactPerson ?? ""}
            className={inputCls}
          />
        </Field>

        <Field label="Телефон" htmlFor="phone">
          <PhoneInput
            id="phone"
            name="phone"
            defaultValue={formatPhone(values.phone)}
          />
        </Field>

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={values.email ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">
          Перечень услуг
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="services"
                value={s}
                defaultChecked={values.services.includes(s)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {SERVICE_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Примечания" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={values.notes ?? ""}
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
        {pending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
