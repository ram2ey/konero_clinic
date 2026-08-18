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

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Adjust to the clinic's actual billing currency.
const CURRENCY = "USD";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: CURRENCY }).format(amount);
}

/**
 * Profiles don't have a dedicated human-friendly medical record number —
 * this derives a short, stable, display-only id from the profile's UUID.
 * It is not a real MRN; add a proper sequential column if one is needed.
 */
export function formatMedicalId(profileId: string): string {
  return `MRN-${profileId.slice(0, 8).toUpperCase()}`;
}
