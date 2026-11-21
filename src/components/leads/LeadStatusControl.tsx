"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LeadStatus } from "@prisma/client";
import { inputCls } from "@/components/ui/styles";
import { LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/labels";
import { changeStatusAction } from "@/features/leads/actions";
import { LostDialog } from "@/components/pipeline/LostDialog";
import { WonDialog } from "@/components/pipeline/WonDialog";

export function LeadStatusControl({
  leadId,
  leadName,
  status,
  budget,
  clientId,
}: {
  leadId: string;
  leadName: string;
  status: LeadStatus;
  budget: number | null;
  clientId: string | null;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"lost" | "won" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status === "WON") {
    return (
      <div className="text-sm">
        <span className="font-medium text-emerald-700">Стал клиентом.</span>{" "}
        {clientId && (
          <Link href={`/clients/${clientId}`} className="text-indigo-600 hover:underline">
            Открыть карточку клиента
          </Link>
        )}
      </div>
    );
  }

  function onChange(next: LeadStatus) {
    setError(null);
    if (next === status) return;
    if (next === "LOST") return setDialog("lost");
    if (next === "WON") return setDialog("won");
    startTransition(async () => {
      const result = await changeStatusAction(leadId, next);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function done(id?: string) {
    setDialog(null);
    if (id) router.push(`/clients/${id}`);
    else router.refresh();
  }

  return (
    <div className="space-y-2">
      <select
        aria-label="Статус заявки"
        value={status}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as LeadStatus)}
        className={`${inputCls} sm:max-w-xs`}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {dialog === "lost" && (
        <LostDialog
          leadId={leadId}
          leadName={leadName}
          onClose={() => setDialog(null)}
          onDone={() => done()}
        />
      )}
      {dialog === "won" && (
        <WonDialog
          leadId={leadId}
          leadName={leadName}
          defaultFee={budget}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
    </div>
  );
}
