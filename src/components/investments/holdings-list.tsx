"use client";

import { useState } from "react";
import { VEHICLE_TYPE_OPTIONS, labelFor } from "@/lib/select-options";
import { Decimal } from "decimal.js";
import type { InstrumentWithTotals } from "@/lib/data/instruments";
import { formatMoney } from "@/lib/ledger/format";

/** PRD §6: tick-box filters per vehicle type, combining into any subset, like a brokerage portfolio page. */
export function HoldingsList({ holdings }: { holdings: InstrumentWithTotals[] }) {
  const [filters, setFilters] = useState<Set<string>>(new Set(["equity", "mutual_fund", "ppf"]));

  function toggle(vehicleType: string) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleType)) next.delete(vehicleType);
      else next.add(vehicleType);
      return next;
    });
  }

  const visible = holdings.filter((h) => filters.has(h.vehicle_type));
  const total = visible.reduce((sum, h) => sum.plus(h.totalInvested), new Decimal(0));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4 text-sm">
        {VEHICLE_TYPE_OPTIONS.map(({ value, label }) => (
          <label key={value} className="flex items-center gap-1.5">
            <input type="checkbox" checked={filters.has(value)} onChange={() => toggle(value)} />
            {label}
          </label>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">No holdings match the selected filters.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {visible.map((h) => (
            <li key={h.id} className="flex items-center justify-between">
              <span>
                {h.name}
                <span className="text-muted-foreground ml-2 text-xs">
                  {labelFor(VEHICLE_TYPE_OPTIONS, h.vehicle_type)}
                  {h.symbol ? ` · ${h.symbol}${h.exchange ? `:${h.exchange}` : ""}` : ""}
                </span>
              </span>
              <span className="tabular-nums">{formatMoney(h.totalInvested)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-between border-t pt-2 text-sm font-medium">
        <span>Total invested (selected)</span>
        <span className="tabular-nums">{formatMoney(total)}</span>
      </div>
    </div>
  );
}
