/**
 * DonutChart — donut with a value legend beside it. Used inside ChartCard so every
 * distribution chart has the same size, spacing and legend.
 */
import type { ReactNode } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

export interface DonutDatum {
  name: string;
  value: number;
  /** Any CSS colour. */
  color: string;
}

export interface DonutChartProps {
  data: DonutDatum[];
  /** Legend value label; defaults to the raw value. */
  formatValue?: (item: DonutDatum) => ReactNode;
}

const DONUT_SIZE = 240;

export function DonutChart({ data, formatValue }: DonutChartProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 sm:flex-row">
      <div className="w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height={DONUT_SIZE}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2.5 text-xs sm:w-1/2">
        {data.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="truncate text-ink-primary">{item.name}</span>
            </span>
            <span className="shrink-0 font-semibold text-ink-primary">{formatValue ? formatValue(item) : item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
