import { Decimal } from "decimal.js";
import { createClient } from "@/lib/supabase/server";
import { toMoneyString } from "@/lib/ledger/money";
import type { Database } from "@/types/database";

export type Instrument = Database["public"]["Tables"]["instruments"]["Row"];

export interface InstrumentWithTotals extends Instrument {
  totalInvested: string;
  totalQuantity: string;
}

export async function listInstruments(): Promise<Instrument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("instruments").select("*").order("name");
  if (error) throw error;
  return data;
}

/**
 * PRD §6: contribution/principal tracking only for MVP — how much has gone
 * in, not live market value. Summed straight from investment transactions,
 * same "computed live, never stored" principle as account balances (§10.1).
 */
export async function listInvestmentHoldingsWithTotals(): Promise<InstrumentWithTotals[]> {
  const supabase = await createClient();
  const [{ data: instruments, error: instrumentsError }, { data: transactions, error: txnError }] = await Promise.all([
    supabase.from("instruments").select("*").order("name"),
    supabase.from("transactions").select("instrument_id, amount, quantity").eq("type", "investment"),
  ]);
  if (instrumentsError) throw instrumentsError;
  if (txnError) throw txnError;

  return instruments.map((instrument) => {
    const rows = transactions.filter((t) => t.instrument_id === instrument.id);
    const totalInvested = rows.reduce((sum, t) => sum.plus(toMoneyString(t.amount)), new Decimal(0));
    const totalQuantity = rows.reduce(
      (sum, t) => sum.plus(t.quantity !== null ? toMoneyString(t.quantity) : "0"),
      new Decimal(0),
    );
    return { ...instrument, totalInvested: totalInvested.toString(), totalQuantity: totalQuantity.toString() };
  });
}
