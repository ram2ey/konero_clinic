import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export const MAX_CATALOG_RESULTS = 20;

export const catalogQuerySchema = z.object({
  query: z.string().trim().min(2).max(200),
});

/**
 * One normalized shape for every reference catalogue the UI can search —
 * ICD-11 codes, medications, lab tests — so a single combobox component
 * renders all three (see components/admin/catalog-combobox.tsx).
 *
 * The catalogue-specific fields are optional rather than hidden behind a
 * generic payload: three concrete optionals stay type-safe at the call
 * site, where an untyped `meta` bag would only push casts onto callers.
 */
export type CatalogMatch = {
  /** Stable identifier: a uuid for medications/lab tests, the code for ICD-11. */
  id: string;
  /** Primary text, and the value written into the field on selection. */
  label: string;
  /** Secondary line in the dropdown (drug class, test category). */
  sublabel?: string | null;
  /** Short chip on the right (ICD-11 code, dosage form). */
  badge?: string | null;
  /** WHO entity URI — ICD-11 only. */
  uri?: string | null;
  /** Formulation strengths — medications only. */
  strengths?: string[];
};

/**
 * Escapes the ILIKE wildcards so a literal "%" or "_" the user types is
 * matched literally instead of acting as a wildcard.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (match) => `\\${match}`);
}

/**
 * Runs the shared "search one reference table by substring" query. Auth is
 * deliberately the caller's job: medications are admin-only, while lab
 * tests are readable by any signed-in user because the patient portal's
 * uploader needs them too (see supabase/migrations for the RLS split).
 */
export async function runCatalogSearch<Row>({
  supabase,
  table,
  columns,
  searchColumn,
  orderColumn,
  query,
  map,
}: {
  supabase: SupabaseServerClient;
  table: string;
  columns: string;
  searchColumn: string;
  orderColumn: string;
  query: string;
  map: (row: Row) => CatalogMatch;
  // Tagged with a boolean rather than discriminated on `error`, because a
  // truthiness check against `unknown` narrows nothing.
}): Promise<{ ok: true; results: CatalogMatch[] } | { ok: false; error: unknown }> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .ilike(searchColumn, `%${escapeLikePattern(query)}%`)
    .order(orderColumn)
    .limit(MAX_CATALOG_RESULTS)
    .returns<Row[]>();

  if (error) return { ok: false, error };

  return { ok: true, results: (data ?? []).map(map) };
}

/**
 * Confirms the caller is signed in, for catalogues that aren't admin-only.
 * As with requireAdmin(), this is a fast, clean failure path — RLS on the
 * table is still what actually enforces access.
 */
export async function requireSignedIn(): Promise<
  { authorized: true; supabase: SupabaseServerClient } | { authorized: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, message: "You must be signed in to do that." };
  }

  return { authorized: true, supabase };
}
