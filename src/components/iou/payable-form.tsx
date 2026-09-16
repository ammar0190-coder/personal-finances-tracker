"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPayable } from "@/lib/actions/iou";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TODAY = new Date().toISOString().slice(0, 10);

/** PRD §7/§12 "IOU payable creation" — no Transactions row yet. */
export function PayableForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [personName, setPersonName] = useState("");
  const [amountOwed, setAmountOwed] = useState("");
  const [dateIncurred, setDateIncurred] = useState(TODAY);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createPayable({ personName, amountOwed, dateIncurred });
        setPersonName("");
        setAmountOwed("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't add that.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Add a payable" className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid gap-2">
        <Label htmlFor="pay-name">Who fronted it</Label>
        <Input id="pay-name" value={personName} onChange={(e) => setPersonName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="pay-amount">Your share</Label>
          <Input id="pay-amount" type="number" step="0.01" value={amountOwed} onChange={(e) => setAmountOwed(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pay-date">Date</Label>
          <Input id="pay-date" type="date" value={dateIncurred} onChange={(e) => setDateIncurred(e.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={isPending || !personName || !amountOwed}>
        {isPending ? "Adding…" : "Add payable"}
      </Button>
    </form>
  );
}
