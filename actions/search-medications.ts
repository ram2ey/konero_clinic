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

type MedicationRow = {
  id: string;
  name: string;
  form: string | null;
  strengths: string[] | null;
  drug_class: string | null;
};

type SearchMedicationsResult = ActionState & { results?: CatalogMatch[] };

/**
 * Admin-only: searches the local `medications` catalogue (WHO Model List
 * of Essential Medicines — see supabase/migrations) for prescription
 * entry. Matches on `search_text`, which folds in the dosage form and
 * drug class, so "antipsychotic" finds olanzapine and not just a literal
 * name match.
 *
 * Same trade as the ICD-11 catalogue: a local table means no external
 * dependency and no credentials to manage, at the cost of completeness.
 * Free-text medication entry stays available in the form for anything
 * the catalogue doesn't carry.
 */
export async function searchMedications(input: { query: string }): Promise<SearchMedicationsResult> {
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

    const result = await runCatalogSearch<MedicationRow>({
      table: "medications",
      columns: "id, name, form, strengths, drug_class",
      searchColumn: "search_text",
      orderColumn: "name",
      query: parsed.data.query,
      map: (row) => ({
        id: row.id,
        label: row.name,
        sublabel: row.drug_class,
        badge: row.form,
        strengths: row.strengths ?? [],
      }),
    });

    if (!result.ok) {
      return {
        status: "error",
        message: logAndSanitize(
          "searchMedications",
          result.error,
          "Medication lookup failed. Please try again.",
        ),
      };
    }

    return { status: "success", results: result.results };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("searchMedications", error, "Medication lookup failed. Please try again."),
    };
  }
}
