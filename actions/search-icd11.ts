"use server";

import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { requireAdmin } from "@/lib/require-admin";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token";

// MMS = the clinical/statistical linearization (the one with real,
// codable ICD-11 categories), as opposed to the much larger, mostly
// uncoded Foundation component. WHO ships a new release roughly
// annually — bump this if search starts failing against a retired
// version.
const RELEASE_VERSION = "2024-01";
const SEARCH_URL = `https://id.who.int/icd/release/11/${RELEASE_VERSION}/mms/search`;

// Best-effort in-memory cache: survives across requests on a warm
// server instance, gets silently rebuilt on a cold one. WHO tokens are
// valid ~1hr, so this just avoids a token round-trip on every keystroke
// rather than being load-bearing for correctness.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const clientId = process.env.WHO_ICD_CLIENT_ID;
  const clientSecret = process.env.WHO_ICD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("WHO_ICD_CLIENT_ID / WHO_ICD_CLIENT_SECRET are not configured.");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "icdapi_access",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WHO token request failed (${response.status})`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  // Refresh a minute early so a request never races an about-to-expire token.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

function stripHighlightMarkup(value: string): string {
  // WHO wraps matched substrings in e.g. <em class='found'>...</em> —
  // strip all tags rather than special-casing that one, so any other
  // markup they add later doesn't leak into the UI either.
  return value.replace(/<[^>]+>/g, "");
}

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
 * Admin-only: searches the WHO ICD-11 API (MMS linearization) for
 * diagnosis coding. Proxied through a Server Action rather than called
 * from the browser because it needs WHO_ICD_CLIENT_SECRET, which must
 * never reach client JS.
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

    const token = await getAccessToken();

    const url = new URL(SEARCH_URL);
    url.searchParams.set("q", parsed.data.query);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Accept-Language": "en",
        "API-Version": "v2",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`WHO search request failed (${response.status})`);
    }

    const data = (await response.json()) as {
      destinationEntities?: { id: string; title: string; theCode?: string }[];
    };

    const results: Icd11Match[] = (data.destinationEntities ?? []).map((entity) => ({
      code: entity.theCode ?? null,
      title: stripHighlightMarkup(entity.title),
      uri: entity.id,
    }));

    return { status: "success", results };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize("searchIcd11", error, "ICD-11 lookup failed. Please try again."),
    };
  }
}
