import "server-only";

import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing for the `users` table. argon2id at the library's
 * defaults (m=19456, t=2, p=1) — fine for an interactive login on a
 * single-clinic app.
 *
 * `@node-rs/argon2` ships prebuilt native binaries for win32 and
 * linux-musl (the Alpine base image), so there's no node-gyp build step.
 */

export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(digest: string, plain: string): Promise<boolean> {
  try {
    return await verify(digest, plain);
  } catch {
    // A malformed stored hash shouldn't 500 the login — treat it as a
    // failed match.
    return false;
  }
}
