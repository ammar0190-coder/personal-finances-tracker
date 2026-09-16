"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logInvestmentContribution } from "@/lib/actions/instruments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/lib/data/accounts";
import type { Instrument } from "@/lib/data/instruments";
import { toOptions } from "@/lib/select-options";

const TODAY = new Date().toISOString().slice(0, 10);

/** PRD §6/§10.7: also covers SIPs, logged manually — one-off or recurring is the same shape. */
export function LogInvestmentForm({ accounts, instruments }: { accounts: Account[]; instruments: Instrument[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedInstrumentId, setInstrumentId] = useState("");
  // Default to the first instrument until one is picked. Derived rather than
  // stored so it still applies when the first instrument is added after this
  // form mounted (the list starts empty for a new user).
  const instrumentId = pickedInstrumentId || instruments[0]?.id || "";
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(TODAY);

  const instrument = instruments.find((i) => i.id === instrumentId);
  const showQuantity = instrument && instrument.vehicle_type !== "ppf";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await logInvestmentContribution({ instrumentId, accountId, amount, quantity: quantity || undefined, date });
        setAmount("");
        setQuantity("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't log that.");
      }
    });
  }

  if (instruments.length === 0) {
    return <p className="text-muted-foreground text-sm">Add an instrument first.</p>;
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Log a contribution" className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid gap-2">
        <Label htmlFor="inv-instrument">Instrument</Label>
        <Select items={toOptions(instruments, (i) => i.name)} value={instrumentId} onValueChange={(v) => setInstrumentId(v ?? "")}>
          <SelectTrigger id="inv-instrument">
            <SelectValue placeholder="Choose an instrument" />
          </SelectTrigger>
          <SelectContent>
            {instruments.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="inv-account">From account</Label>
        <Select items={toOptions(accounts, (a) => a.name)} value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
          <SelectTrigger id="inv-account">
            <SelectValue placeholder="Choose an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="inv-amount">Amount</Label>
          <Input id="inv-amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="inv-date">Date</Label>
          <Input id="inv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      {showQuantity && (
        <div className="grid gap-2">
          <Label htmlFor="inv-quantity">Units/shares bought (optional)</Label>
          <Input id="inv-quantity" type="number" step="0.0001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
      )}
      <Button type="submit" disabled={isPending || !instrumentId || !accountId || !amount}>
        {isPending ? "Logging…" : "Log contribution"}
      </Button>
    </form>
  );
}
