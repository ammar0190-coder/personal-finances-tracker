"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SEQUENTIAL_LINE_COLOR } from "@/lib/charts/colors";
import type { MonthPoint } from "@/lib/data/reports";
import { formatMoney } from "@/lib/ledger/format";

/** PRD §9 "Trend over time" — a single series needs no legend (dataviz skill). */
export function TrendChart({ points }: { points: MonthPoint[] }) {
  const data = points.map((p) => ({ month: p.month.slice(2), spend: Number(p.spend), spendExact: p.spend }));

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            // Plotted as a number for position only; the tooltip shows the exact amount.
            formatter={(_value, _name, item) => [formatMoney(item.payload.spendExact), "Effective spend"]}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }}
          />
          <Line type="monotone" dataKey="spend" stroke={SEQUENTIAL_LINE_COLOR} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
