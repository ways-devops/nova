"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { btnSecondary } from "@/components/ui/styles";
import { mergeLeadsAction } from "@/features/leads/actions";

export function MergeButton({
  primaryId,
  duplicateId,
}: {
  primaryId: string;
  duplicateId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function merge() {
    if (
      !window.confirm(
        "Объединить заявки? История, задачи и диалоги дубликата перейдут в эту заявку.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await mergeLeadsAction(primaryId, duplicateId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div>
      <button type="button" onClick={merge} disabled={pending} className={btnSecondary}>
        {pending ? "Объединяем…" : "Объединить с этой"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
