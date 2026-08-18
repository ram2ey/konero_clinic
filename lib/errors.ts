import "server-only";

/**
 * Logs the full error server-side and returns a generic, safe message for
 * the client. Never forward a raw Supabase/Postgres `error.message` to the
 * browser — it can include constraint names, column names, or fragments
 * of the query, which is more schema detail than a patient or admin
 * should ever see in a UI. `console.error` is a placeholder for wiring
 * into real log aggregation (e.g. Sentry, Logtail) before production.
 */
export function logAndSanitize(context: string, error: unknown, fallback: string): string {
  console.error(`[${context}]`, error);
  return fallback;
}
