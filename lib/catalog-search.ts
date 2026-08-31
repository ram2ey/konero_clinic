import "server-only";

import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { query } from "@/lib/db";

export const MAX_CATALOG_RESULTS = 20;

export const catalogQuerySchema = z.object({
  query: z.string().trim().min(2).max(200),
});

/**
 * One normalized shape for every reference catalogue the UI can search —
 * ICD-11 codes, medications, lab tests — so a single combobox renders all
 * three (see components/catalog-combobox.tsx).
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

// SQL identifiers can't be parameterised, so table / column names are
// pinned to a literal allowlist — only these three call sites exist and
// no user input ever reaches these fields.
const ALLOWED_TABLES = new Set(["icd11_codes", "medications", "lab_tests"]);
const IDENT = /^[a-z_][a-z0-9_]*$/;

/**
 * Runs the shared "search one reference table by substring" query.
 * `SELECT <columns> FROM <table> WHERE <searchColumn> ILIKE $1 ORDER BY
 * <orderColumn> LIMIT 20`.
 */
export async function runCatalogSearch<Row>({
  table,
  columns,
  searchColumn,
  orderColumn,
  query: searchText,
  map,
}: {
  table: string;
  columns: string;
  searchColumn: string;
  orderColumn: string;
  query: string;
  map: (row: Row) => CatalogMatch;
}): Promise<{ ok: true; results: CatalogMatch[] } | { ok: false; error: unknown }> {
  if (
    !ALLOWED_TABLES.has(table) ||
    !IDENT.test(searchColumn) ||
    !IDENT.test(orderColumn)
  ) {
    return { ok: false, error: new Error(`runCatalogSearch: disallowed identifier`) };
  }

  try {
    const { rows } = await query<Row extends Record<string, unknown> ? Row : never>(
      `select ${columns}
         from public.${table}
        where ${searchColumn} ilike $1
        order by ${orderColumn}
        limit ${MAX_CATALOG_RESULTS}`,
      [`%${escapeLikePattern(searchText)}%`],
    );
    return { ok: true, results: (rows as Row[]).map(map) };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * Confirms the caller is signed in, for catalogues that aren't admin-only
 * (lab tests — the patient portal's uploader needs them).
 */
export async function requireSignedIn(): Promise<
  { authorized: true } | { authorized: false; message: string }
> {
  const user = await getSessionUser();
  if (!user) {
    return { authorized: false, message: "You must be signed in to do that." };
  }
  return { authorized: true };
}
