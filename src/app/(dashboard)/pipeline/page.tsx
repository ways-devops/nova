import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PipelineBoard, type BoardLead } from "@/components/pipeline/PipelineBoard";
import { btnPrimary } from "@/components/ui/styles";

export const metadata = { title: "Воронка" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  await requireUser();

  const leads = await prisma.lead.findMany({
    where: { mergedIntoId: null },
    orderBy: { receivedAt: "desc" },
    take: 500,
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      budget: true,
      source: true,
      status: true,
    },
  });

  const board: BoardLead[] = leads;

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Воронка продаж</h1>
          <p className="mt-1 text-sm text-slate-500">
            Перетащите карточку в другой столбец. На телефоне используйте
            выпадающий список на карточке.
          </p>
        </div>
        <Link href="/leads/new" className={btnPrimary}>
          + Новая заявка
        </Link>
      </div>

      <PipelineBoard initialLeads={board} />
    </div>
  );
}
