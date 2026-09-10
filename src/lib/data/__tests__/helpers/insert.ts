import type { PostgrestResponse, PostgrestSingleResponse } from "@supabase/supabase-js";

function describeError(error: { code: string; message: string; details?: string | null; hint?: string | null }): string {
  const detail = [error.details, error.hint].filter(Boolean).join(" ");
  return `[${error.code}]: ${error.message}${detail ? ` — ${detail}` : ""}`;
}

/**
 * Unwrap a single-row query in an integration test's setup, failing loudly.
 *
 * The pattern these replace — `const { data } = await ...; data!.id` — discards
 * the PostgrestError, so a rejected query surfaces as "Cannot read properties of
 * null (reading 'id')" at the dereference. That hides which row failed and why.
 * `what` labels the row so the message points straight at the offending line.
 */
export async function insertOne<T>(query: PromiseLike<PostgrestSingleResponse<T>>, what: string): Promise<T> {
  const { data, error } = await query;

  if (error) throw new Error(`insert ${what} failed ${describeError(error)}`);
  if (!data) throw new Error(`insert ${what} returned no row and no error`);

  return data;
}

/** As {@link insertOne}, for a `.single()` read rather than an insert. */
export async function selectOne<T>(query: PromiseLike<PostgrestSingleResponse<T>>, what: string): Promise<T> {
  const { data, error } = await query;

  if (error) throw new Error(`select ${what} failed ${describeError(error)}`);
  if (!data) throw new Error(`select ${what} returned no row and no error`);

  return data;
}

/** As {@link selectOne}, for a multi-row read. An empty result is valid and returns `[]`. */
export async function selectRows<T>(query: PromiseLike<PostgrestResponse<T>>, what: string): Promise<T[]> {
  const { data, error } = await query;

  if (error) throw new Error(`select ${what} failed ${describeError(error)}`);
  if (!data) throw new Error(`select ${what} returned no rows and no error`);

  return data;
}
