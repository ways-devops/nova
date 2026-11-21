import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { LeadForm } from "@/components/leads/LeadForm";
import { cardCls } from "@/components/ui/styles";
import { createLeadAction } from "@/features/leads/actions";
import { toInputDate } from "@/lib/utils/date";

export const metadata = { title: "Новая заявка" };

export default async function NewLeadPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-700">
        ← К заявкам
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Новая заявка</h1>

      <div className={`${cardCls} mt-5`}>
        <LeadForm
          action={createLeadAction}
          defaults={{ receivedAt: toInputDate(), source: "AVITO" }}
          submitLabel="Создать заявку"
        />
      </div>
    </div>
  );
}
