"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/ledger/format";

/** Privacy mode display (PRD §2, §8): masked by default, per-account reveal. */
export function MaskedBalance({ value, defaultMasked }: { value: string; defaultMasked: boolean }) {
  const [revealed, setRevealed] = useState(!defaultMasked);
  const negative = value.startsWith("-");

  return (
    <button
      type="button"
      onClick={() => setRevealed((r) => !r)}
      className={`font-mono text-lg tabular-nums ${negative ? "text-destructive" : ""}`}
      title={revealed ? "Tap to hide" : "Tap to reveal"}
    >
      {revealed ? formatMoney(value) : "₹xx,xx,xxx"}
    </button>
  );
}

export function RevealToggleHint() {
  return <span className="text-muted-foreground text-xs">Tap a balance to reveal it</span>;
}
