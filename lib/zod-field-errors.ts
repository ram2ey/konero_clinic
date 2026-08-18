import type { z } from "zod";

/**
 * Flattens a ZodError into path-keyed messages, e.g. "diagnoses.0.condition"
 * for a nested array field. `error.flatten().fieldErrors` only reports
 * top-level keys, so on a schema with array-of-object fields (diagnoses,
 * prescriptions) it collapses every nested issue into one generic message
 * on the array key and loses which item/field actually failed.
 */
export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
