"use server";

import type { ActionState } from "@/lib/action-state";
import {
  catalogQuerySchema,
  runCatalogSearch,
  type CatalogMatch,
} from "@/lib/catalog-search";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

type Icd11Row = {
  // Sourced from icd11_codes.code, the table's primary key — never null.
  code: string;
  title: string;
  uri: string;
};

type SearchIcd11Result = ActionState & { results?: CatalogMatch[] };

/**
 * Admin-only: searches the local `icd11_codes` table (a curated bundle
 * of common diagnoses — see supabase/migrations) for diagnosis coding.
 *
 * This used to call the live WHO ICD-11 API, but that added an external
 * network dependency, OAuth credentials to manage, and was a live point
 * of failure — see git history on this file. A local table trades
 * completeness (this covers common diagnoses, not the full ~17,000-entry
 * classification) for reliability and zero external dependencies.
 *
 * Returns the shared CatalogMatch shape so the same combobox serves
 * diagnoses, medications and lab tests — the ICD code rides in `badge`
 * and `id`, the WHO entity URI in `uri`.
 */
export async function searchIcd11(input: { query: string }): Promise<SearchIcd11Result> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const parsed = catalogQuerySchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const result = await runCatalogSearch<Icd11Row>({
      table: "icd11_codes",
      columns: "code, title, uri",
      searchColumn: "title",
      orderColumn: "title",
      query: parsed.data.query,
      map: (row) => ({
        id: row.code,
        label: row.title,
        badge: row.code,
        uri: row.uri,
      }),
    });

    if (!result.ok) {
      return {
        status: "error",
        message: logAndSanitize("searchIcd11", result.error, "ICD-11 lookup failed. Please try again."),
      };
    }

    return { status: "success", results: result.results };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("searchIcd11", error, "ICD-11 lookup failed. Please try again."),
    };
  }
}
