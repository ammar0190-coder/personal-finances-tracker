"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInstrument } from "@/lib/actions/instruments";
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
import { VEHICLE_TYPE_OPTIONS } from "@/lib/select-options";

export function AddInstrumentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<"equity" | "mutual_fund" | "ppf">("mutual_fund");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [exchange, setExchange] = useState("");

  const isTradeable = vehicleType !== "ppf";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createInstrument({ vehicleType, name, symbol: symbol || undefined, exchange: exchange || undefined });
        setName("");
        setSymbol("");
        setExchange("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't add that.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid gap-2">
        <Label>Vehicle type</Label>
        <Select items={VEHICLE_TYPE_OPTIONS} value={vehicleType} onValueChange={(v) => setVehicleType((v ?? "mutual_fund") as typeof vehicleType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="inst-name">Name</Label>
        <Input id="inst-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="SBI PPF" />
      </div>
      {isTradeable && (
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="inst-symbol">Ticker / scheme code</Label>
            <Input id="inst-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inst-exchange">Exchange</Label>
            <Input id="inst-exchange" value={exchange} onChange={(e) => setExchange(e.target.value)} placeholder="NSE" />
          </div>
        </div>
      )}
      <Button type="submit" disabled={isPending || !name}>
        {isPending ? "Adding…" : "Add instrument"}
      </Button>
    </form>
  );
}
