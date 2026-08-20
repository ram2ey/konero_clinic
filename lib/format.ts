export function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasHadBirthdayThisYear =
    today.getUTCMonth() > birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() >= birthDate.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

// Pinned rather than the runtime default (`undefined`): these run during
// SSR too, and the server's locale doesn't necessarily match the
// browser's, which produces a same-content-different-text mismatch
// between the server-rendered and client-rendered output — React discards
// and re-renders the whole tree client-side when that happens.
const LOCALE = "en-US";

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Adjust to the clinic's actual billing currency.
const CURRENCY = "USD";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY }).format(amount);
}

/**
 * Profiles don't have a dedicated human-friendly medical record number —
 * this derives a short, stable, display-only id from the profile's UUID.
 * It is not a real MRN; add a proper sequential column if one is needed.
 */
export function formatMedicalId(profileId: string): string {
  return `MRN-${profileId.slice(0, 8).toUpperCase()}`;
}

/** "partially_reliable" -> "Partially reliable". For displaying enum/db values. */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return "Not on file";
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
