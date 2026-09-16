"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORICAL_COLORS } from "@/lib/charts/colors";
import type { CategoryBreakdownRow } from "@/lib/data/reports";
import { formatMoney } from "@/lib/ledger/format";

/**
 * PRD §9: category breakdown chart + subcategory drill-down (tap a
 * category to expand into its subcategories, per the dataviz skill's
 * magnitude-comparison form — a sorted horizontal bar chart, one bar per
 * category, each directly labeled so no legend is needed).
 */
export function CategoryBreakdownChart({ rows }: { rows: CategoryBreakdownRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No spend logged for this period.</p>;
  }

  const chartData = rows.map((r) => ({ name: r.name, amount: Number(r.amount), amountExact: r.amount, categoryId: r.categoryId }));
  const expandedRow = rows.find((r) => r.categoryId === expanded);

  return (
    <div className="flex flex-col gap-4">
      <div style={{ width: "100%", height: Math.max(120, rows.length * 40) }}>
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 12, fill: "var(--foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              // Plotted as a number for position only; the tooltip shows the exact amount.
              formatter={(_value, _name, item) => [formatMoney(item.payload.amountExact), "Spend"]}
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }}
            />
            <Bar
              dataKey="amount"
              radius={[0, 4, 4, 0]}
              onClick={(d) => {
                const categoryId = (d as unknown as { payload: { categoryId: string } }).payload.categoryId;
                setExpanded(categoryId === expanded ? null : categoryId);
              }}
              cursor="pointer"
            >
              {chartData.map((entry, i) => (
                <Cell key={entry.categoryId} fill={CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {expandedRow && (
        <div className="rounded-md border p-3 text-sm">
          <p className="mb-2 font-medium">{expandedRow.name} — subcategories</p>
          {expandedRow.subcategories.length === 0 ? (
            <p className="text-muted-foreground text-xs">No subcategory detail logged — all blended (PRD §4).</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {expandedRow.subcategories.map((s) => (
                <li key={s.categoryId} className="flex justify-between">
                  <span>{s.name}</span>
                  <span className="font-mono">{formatMoney(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
