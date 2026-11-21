import type { LeadStatus } from "@prisma/client";
import { LEAD_STATUS_BADGE, LEAD_STATUS_LABEL } from "@/lib/labels";

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_STATUS_BADGE[status]}`}
    >
      {LEAD_STATUS_LABEL[status]}
    </span>
  );
}
