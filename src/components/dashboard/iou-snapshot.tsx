import Link from "next/link";
import { getIouSnapshot } from "@/lib/data/iou";
import { SECTION_LABEL } from "@/components/shell/section";
import { formatMoney } from "@/lib/ledger/format";

/** PRD §8: IOU snapshot, shown at lower visual priority than balances/burn-down. */
export async function IouSnapshot() {
  const snapshot = await getIouSnapshot();
  if (snapshot.netReceivable === "0" && snapshot.netPayable === "0") return null;

  return (
    // A position, not a period figure, and ranked below balances and burn-down
    // per PRD §8 — so it gets the quietest treatment on the page, not a card.
    <section aria-label="IOU snapshot" className="flex flex-col">
      <Link href="/iou" className="group flex items-center gap-8 border-y border-border py-4">
        <div className="flex flex-col gap-1">
          <span className={SECTION_LABEL}>Owed to you</span>
          <span className="tabular-nums">{formatMoney(snapshot.netReceivable)}</span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col gap-1">
          <span className={SECTION_LABEL}>You owe</span>
          <span className="tabular-nums">{formatMoney(snapshot.netPayable)}</span>
        </div>
        <span className="ml-auto text-xs text-muted-foreground group-hover:text-foreground">Open IOU →</span>
      </Link>
    </section>
  );
}
