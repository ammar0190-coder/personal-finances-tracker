"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Decimal } from "decimal.js";
import { recordRepayment, recordSettlement, writeOffEntry } from "@/lib/actions/iou";
import { toMoneyString } from "@/lib/ledger/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IouEntry } from "@/lib/data/iou";
import type { Account } from "@/lib/data/accounts";

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * One Receivable/Payable/Reimbursement row. `settlementKind` picks which
 * transaction type recording money against it creates — `iou_repayment` for
 * receivables and reimbursements (never counts as fresh spend), or
 * `iou_settlement` for payables (real spend at settlement, §10.2).
 */
export function IouEntryRow({
  entry,
  accounts,
  settlementKind,
}: {
  entry: IouEntry;
  accounts: Account[];
  settlementKind: "iou_repayment" | "iou_settlement";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [recording, setRecording] = useState(false);
  const [amount, setAmount] = useState(
    new Decimal(toMoneyString(entry.amount_owed)).minus(toMoneyString(entry.amount_settled)).toString(),
  );
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const remaining = toMoneyString(entry.amount_owed);
  const isClosed = entry.status === "settled" || entry.status === "written_off";

  function handleRecord() {
    setError(null);
    startTransition(async () => {
      try {
        const record = settlementKind === "iou_settlement" ? recordSettlement : recordRepayment;
        await record(entry.id, { amount, accountId, date: TODAY });
        setRecording(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't record that.");
      }
    });
  }

  function handleWriteOff() {
    startTransition(async () => {
      await writeOffEntry(entry.id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 border-b pb-2 text-sm last:border-0">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{entry.person_name}</span>
          <span className="text-muted-foreground ml-2 text-xs">{entry.date_incurred}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono">
            ₹{toMoneyString(entry.amount_settled)} / ₹{remaining}
          </span>
          <Badge variant={entry.status === "settled" ? "default" : entry.status === "written_off" ? "secondary" : "outline"}>
            {entry.status}
          </Badge>
        </div>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      {!isClosed && (
        <div className="flex items-center gap-2">
          {recording ? (
            <>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-24" />
              <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleRecord} disabled={isPending || !accountId}>
                Confirm
              </Button>
              <button type="button" onClick={() => setRecording(false)} className="text-muted-foreground text-xs underline">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setRecording(true)} className="text-primary text-xs underline">
                Record payment
              </button>
              <button type="button" onClick={handleWriteOff} disabled={isPending} className="text-muted-foreground hover:text-destructive text-xs underline">
                Write off
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
