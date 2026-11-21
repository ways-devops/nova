export function ProgressBar({
  label,
  value,
  goal,
  valueLabel,
}: {
  label: string;
  value: number;
  goal: number;
  valueLabel: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium">{valueLabel}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-indigo-600"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
