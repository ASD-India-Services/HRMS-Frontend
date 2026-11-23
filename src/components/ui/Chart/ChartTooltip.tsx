/** ChartTooltip — Minimal-style recharts tooltip: paper surface, dropdown shadow, rounded. */
interface TooltipEntry {
  name?: string | number;
  value?: string | number | ReadonlyArray<string | number>;
  color?: string;
  payload?: { fill?: string };
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<TooltipEntry>;
}

export function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded bg-surface-paper px-3 py-2 text-xs shadow-dropdown">
      {label !== undefined && label !== '' && <p className="mb-1 font-semibold text-ink-primary">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((entry, i) => (
          <li key={`${entry.name}-${i}`} className="flex items-center gap-2 text-ink-secondary">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? entry.payload?.fill }}
              aria-hidden="true"
            />
            <span>{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold text-ink-primary">{String(entry.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
