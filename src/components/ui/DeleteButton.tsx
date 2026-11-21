"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/features/leads/types";

/** Кнопка удаления с подтверждением. После успеха переходит на redirectTo. */
export function DeleteButton({
  label,
  confirmText,
  action,
  redirectTo,
}: {
  label: string;
  confirmText: string;
  action: () => Promise<ActionResult>;
  redirectTo: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
      >
        {pending ? "Удаляем…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
