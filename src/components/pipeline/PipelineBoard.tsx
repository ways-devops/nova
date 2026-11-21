"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { LeadSource, LeadStatus } from "@prisma/client";
import {
  LEAD_STATUSES,
  LEAD_STATUS_BADGE,
  LEAD_STATUS_LABEL,
  SOURCE_LABEL,
} from "@/lib/labels";
import { formatRub } from "@/lib/utils/format";
import { formatPhone } from "@/lib/utils/phone";
import { changeStatusAction } from "@/features/leads/actions";
import { LostDialog } from "./LostDialog";
import { WonDialog } from "./WonDialog";

export type BoardLead = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  budget: number | null;
  source: LeadSource;
  status: LeadStatus;
};

type Dialog = { type: "lost" | "won"; lead: BoardLead } | null;

export function PipelineBoard({ initialLeads }: { initialLeads: BoardLead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [overColumn, setOverColumn] = useState<LeadStatus | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // После router.refresh() подтягиваем свежие данные с сервера
  useEffect(() => setLeads(initialLeads), [initialLeads]);

  function setStatus(id: string, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  function move(lead: BoardLead, status: LeadStatus) {
    setError(null);
    if (lead.status === status) return;
    if (lead.status === "WON") {
      setError("Заявка уже стала клиентом. Изменения вносите в карточке клиента.");
      return;
    }
    if (status === "LOST") return setDialog({ type: "lost", lead });
    if (status === "WON") return setDialog({ type: "won", lead });

    const previous = lead.status;
    setStatus(lead.id, status); // сразу двигаем карточку
    startTransition(async () => {
      const result = await changeStatusAction(lead.id, status);
      if (result.ok) {
        router.refresh();
      } else {
        setStatus(lead.id, previous); // откат, если сервер отказал
        setError(result.error);
      }
    });
  }

  function dialogDone(clientId?: string) {
    if (!dialog) return;
    const { type, lead } = dialog;
    setStatus(lead.id, type === "lost" ? "LOST" : "WON");
    setDialog(null);
    if (clientId) router.push(`/clients/${clientId}`);
    else router.refresh();
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Сетка 3 колонки: 7 этапов = ряды 3 + 3 + 1. На телефоне — один столбец. */}
      <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEAD_STATUSES.map((status) => {
            const column = leads.filter((l) => l.status === status);
            const sum = column.reduce((acc, l) => acc + (l.budget ?? 0), 0);
            const isOver = overColumn === status;

            return (
              <section
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setOverColumn(status)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setOverColumn(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverColumn(null);
                  const id = e.dataTransfer.getData("text/plain");
                  const lead = leads.find((l) => l.id === id);
                  if (lead) move(lead, status);
                }}
                className={`flex min-w-0 flex-col rounded-xl border p-3 transition lg:h-[calc((100dvh-11rem)/3)] lg:min-h-[12rem] ${
                  isOver
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 bg-slate-100/60"
                }`}
              >
                <header className="mb-3 flex shrink-0 items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_STATUS_BADGE[status]}`}
                  >
                    {LEAD_STATUS_LABEL[status]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {column.length}
                    {sum > 0 && ` · ${formatRub(sum)}`}
                  </span>
                </header>

                {/* Список карточек прокручивается внутри колонки, страница не растягивается */}
                <div className="max-h-72 space-y-2 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
                  {column.map((lead) => (
                    <article
                      key={lead.id}
                      draggable={lead.status !== "WON"}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", lead.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${
                        lead.status !== "WON" ? "cursor-grab active:cursor-grabbing" : ""
                      }`}
                    >
                      <Link
                        href={`/leads/${lead.id}`}
                        draggable={false}
                        className="block truncate font-medium hover:text-indigo-600"
                      >
                        {lead.name}
                      </Link>
                      {lead.company && (
                        <p className="truncate text-sm text-slate-500">{lead.company}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                        {lead.phone && <span>{formatPhone(lead.phone)}</span>}
                        <span>{SOURCE_LABEL[lead.source]}</span>
                        {lead.budget != null && <span>{formatRub(lead.budget)}</span>}
                      </div>

                      {lead.status !== "WON" && (
                        <select
                          aria-label={`Переместить «${lead.name}»`}
                          value={lead.status}
                          onChange={(e) => move(lead, e.target.value as LeadStatus)}
                          className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                        >
                          {LEAD_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {LEAD_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      )}
                    </article>
                  ))}

                  {column.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400">Пусто</p>
                  )}
                </div>
              </section>
            );
          })}
      </div>

      {dialog?.type === "lost" && (
        <LostDialog
          leadId={dialog.lead.id}
          leadName={dialog.lead.name}
          onClose={() => setDialog(null)}
          onDone={() => dialogDone()}
        />
      )}
      {dialog?.type === "won" && (
        <WonDialog
          leadId={dialog.lead.id}
          leadName={dialog.lead.name}
          defaultFee={dialog.lead.budget}
          onClose={() => setDialog(null)}
          onDone={dialogDone}
        />
      )}
    </>
  );
}
