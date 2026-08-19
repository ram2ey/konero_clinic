import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** True if a string is non-blank, or an object has any field that is. */
export function hasAnyValue(value: unknown): boolean {
  if (!value) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasAnyValue)
  return false
}
