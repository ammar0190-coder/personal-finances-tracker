"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type VehicleType = Database["public"]["Enums"]["instrument_vehicle_type"];

export interface CreateInstrumentInput {
  vehicleType: VehicleType;
  name: string;
  symbol?: string;
  exchange?: string;
}

export async function createInstrument(input: CreateInstrumentInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("instruments").insert({
    user_id: user.id,
    vehicle_type: input.vehicleType,
    name: input.name,
    // PRD §11: symbol/exchange are only meaningful for tradeable vehicles —
    // the DB's own `symbol_only_for_tradeable` constraint backs this up.
    symbol: input.vehicleType === "ppf" ? null : input.symbol || null,
    exchange: input.vehicleType === "ppf" ? null : input.exchange || null,
  });
  if (error) throw error;
  revalidatePath("/investments");
}

export interface LogInvestmentInput {
  instrumentId: string;
  accountId: string;
  amount: string;
  quantity?: string;
  date: string;
}

/** PRD §10.7: debits the source account, never counts as spend. */
export async function logInvestmentContribution(input: LogInvestmentInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "investment",
    account_id: input.accountId,
    instrument_id: input.instrumentId,
    amount: input.amount as unknown as number,
    quantity: (input.quantity || null) as unknown as number | null,
    date: input.date,
  });
  if (error) throw error;
  revalidatePath("/investments");
  revalidatePath("/", "layout");
}
