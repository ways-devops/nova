// Кольцевая диаграмма на чистом SVG — без внешних библиотек.
const COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#94a3b8"];

export type SourceDatum = { label: string; count: number };

export function SourceChart({ data }: { data: SourceDatum[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0);

  if (total === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        Данных пока нет — диаграмма появится после первых заявок.
      </p>
    );
  }

  const sorted = [...data].sort((a, b) => b.count - a.count);
  let acc = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg
        viewBox="0 0 36 36"
        className="h-40 w-40 shrink-0 -rotate-90"
        role="img"
        aria-label="Источники заявок"
      >
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="4" />
        {sorted.map((d, i) => {
          const pct = (d.count / total) * 100;
          const el = (
            <circle
              key={d.label}
              cx="18"
              cy="18"
              r="15.9155"
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="4"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={-acc}
            />
          );
          acc += pct;
          return el;
        })}
      </svg>

      <ul className="w-full space-y-1.5 text-sm">
        {sorted.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              {d.label}
            </span>
            <span className="text-slate-500">
              {d.count} · {Math.round((d.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
