"use server";

import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const MAX_RESULTS = 20;

const searchIcd11Schema = z.object({
  query: z.string().trim().min(2).max(200),
});

export type SearchIcd11Input = z.input<typeof searchIcd11Schema>;

export type Icd11Match = {
  code: string | null;
  title: string;
  uri: string;
};

type SearchIcd11Result = ActionState & { results?: Icd11Match[] };

/**
 * Admin-only: searches the local `icd11_codes` table (a curated bundle
 * of common diagnoses — see supabase/migrations) for diagnosis coding.
 *
 * This used to call the live WHO ICD-11 API, but that added an external
 * network dependency, OAuth credentials to manage, and was a live point
 * of failure — see git history on this file. A local table trades
 * completeness (this covers common diagnoses, not the full ~17,000-entry
 * classification) for reliability and zero external dependencies.
 */
export async function searchIcd11(input: SearchIcd11Input): Promise<SearchIcd11Result> {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return { status: "error", message: admin.message };
    }

    const parsed = searchIcd11Schema.safeParse(input);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please fix the errors below.",
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    // Escape ILIKE wildcard characters in the user's own input so a
    // literal "%" or "_" they type doesn't act as a wildcard.
    const escaped = parsed.data.query.replace(/[%_\\]/g, (match) => `\\${match}`);

    const { data, error } = await admin.supabase
      .from("icd11_codes")
      .select("code, title, uri")
      .ilike("title", `%${escaped}%`)
      .order("title")
      .limit(MAX_RESULTS);

    if (error) {
      return {
        status: "error",
        message: logAndSanitize("searchIcd11", error, "ICD-11 lookup failed. Please try again."),
      };
    }

    return { status: "success", results: (data ?? []) as Icd11Match[] };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("searchIcd11", error, "ICD-11 lookup failed. Please try again."),
    };
  }
}
