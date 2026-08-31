"use server";

import type { ActionState } from "@/lib/action-state";
import {
  catalogQuerySchema,
  requireSignedIn,
  runCatalogSearch,
  type CatalogMatch,
} from "@/lib/catalog-search";
import { logAndSanitize } from "@/lib/errors";
import { zodFieldErrors } from "@/lib/zod-field-errors";

type LabTestRow = {
  id: string;
  name: string;
  category: string | null;
  specimen: string | null;
};

type SearchLabTestsResult = ActionState & { results?: CatalogMatch[] };

/**
 * Searches the local `lab_tests` catalogue — despite the table name, this
 * covers every kind of investigation: the WHO Model List of Essential In
 * Vitro Diagnostics plus locally-added panels for biological/laboratory
 * tests, and separately-seeded imaging/radiology and endoscopic/invasive
 * procedures (see supabase/migrations) — for ordering investigations and
 * for naming an uploaded result.
 *
 * Signed-in rather than admin-only, unlike the other two catalogues: the
 * patient portal's uploader (components/LabUploader.tsx) uses the same
 * picker so a result gets filed under the same name it was ordered under.
 * The table carries no patient data, and its RLS policy grants the same
 * authenticated read.
 *
 * Matches on `search_text`, which folds in the aliases — 'FBC' has to
 * find 'Full blood count'.
 */
export async function searchLabTests(input: { query: string }): Promise<SearchLabTestsResult> {
  try {
    const access = await requireSignedIn();
    if (!access.authorized) {
      return { status: "error", message: access.message };
    }

    const parsed = catalogQuerySchema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const result = await runCatalogSearch<LabTestRow>({
      table: "lab_tests",
      columns: "id, name, category, specimen",
      searchColumn: "search_text",
      orderColumn: "name",
      query: parsed.data.query,
      map: (row) => ({
        id: row.id,
        label: row.name,
        sublabel: row.specimen,
        badge: row.category,
      }),
    });

    if (!result.ok) {
      return {
        status: "error",
        message: logAndSanitize("searchLabTests", result.error, "Investigation lookup failed. Please try again."),
      };
    }

    return { status: "success", results: result.results };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("searchLabTests", error, "Investigation lookup failed. Please try again."),
    };
  }
}
