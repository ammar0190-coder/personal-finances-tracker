"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/lib/actions/accounts";
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

export function AddAccountForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [role, setRole] = useState("");
  const [accountType, setAccountType] = useState<"bank" | "credit_card">("bank");
  const [isSpendAccount, setIsSpendAccount] = useState(false);
  const [isSavings, setIsSavings] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createAccount({
          name,
          institution: institution || undefined,
          role: role || undefined,
          accountType,
          isSpendAccount,
          isSavings,
        });
        setName("");
        setInstitution("");
        setRole("");
        setIsSpendAccount(false);
        setIsSavings(false);
        router.refresh();
        onDone?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't create the account.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid gap-2">
        <Label htmlFor="acc-name">Name</Label>
        <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="HDFC" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="acc-institution">Institution (optional)</Label>
        <Input
          id="acc-institution"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder="HDFC Bank"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="acc-role">Role, in your own words (optional)</Label>
        <Input
          id="acc-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Salary lands here"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="acc-type">Account type</Label>
        <Select value={accountType} onValueChange={(v) => setAccountType(v as "bank" | "credit_card")}>
          <SelectTrigger id="acc-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank">Bank</SelectItem>
            <SelectItem value="credit_card">Credit card</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isSpendAccount} onChange={(e) => setIsSpendAccount(e.target.checked)} />
          Spend account (budget ceiling)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isSavings} onChange={(e) => setIsSavings(e.target.checked)} />
          Savings account
        </label>
      </div>
      <Button type="submit" disabled={isPending || !name}>
        {isPending ? "Adding…" : "Add account"}
      </Button>
    </form>
  );
}
