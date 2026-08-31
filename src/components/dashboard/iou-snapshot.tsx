import Link from "next/link";
import { getIouSnapshot } from "@/lib/data/iou";
import { Card, CardContent } from "@/components/ui/card";

/** PRD §8: IOU snapshot, shown at lower visual priority than balances/burn-down. */
export async function IouSnapshot() {
  const snapshot = await getIouSnapshot();
  if (snapshot.netReceivable === "0" && snapshot.netPayable === "0") return null;

  return (
    <Card className="py-3">
      <CardContent className="flex items-center justify-between px-4 text-xs">
        <Link href="/iou" className="text-muted-foreground hover:text-foreground">
          IOU: owed to you ₹{snapshot.netReceivable} · you owe ₹{snapshot.netPayable}
        </Link>
      </CardContent>
    </Card>
  );
}
