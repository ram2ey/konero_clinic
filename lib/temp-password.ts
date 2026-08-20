import "server-only";

import { randomInt } from "node:crypto";

// Deliberately excludes characters that are easily confused when a
// password is read aloud over the phone or copied off a screen: 0/O,
// 1/l/I, 5/S, 8/B. What's left is 30 symbols, so 12 characters carry
// ~59 bits of entropy — far beyond what a temporary, single-use,
// rate-limited credential needs.
const ALPHABET = "ACDEFGHJKMNPQRTUVWXYZabcdefghijkmnpqrtuvwxyz2346799";

const GROUPS = 3;
const GROUP_LENGTH = 4;

/**
 * Generates a temporary password for a newly registered patient.
 *
 * Grouped as xxxx-xxxx-xxxx because this credential's whole job is to be
 * transcribed by a human — read out at the desk, sent by SMS, typed once.
 * Hyphens make that measurably less error-prone.
 *
 * randomInt() (CSPRNG, rejection-sampled) rather than Math.random(), and
 * modulo is avoided so every symbol is equally likely.
 *
 * The result is never persisted: it is set on the auth user, returned to
 * the admin once, and forgotten. The patient is forced to replace it at
 * first sign-in — see app/auth/set-password/page.tsx.
 */
export function generateTempPassword(): string {
  const groups: string[] = [];

  for (let g = 0; g < GROUPS; g++) {
    let group = "";
    for (let i = 0; i < GROUP_LENGTH; i++) {
      group += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(group);
  }

  return groups.join("-");
}
