"use server";

import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { getSessionUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { query } from "@/lib/db";
import { logAndSanitize } from "@/lib/errors";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});

/**
 * Sets the signed-in user's password and clears the
 * `must_change_password` flag. This is the whole "set your password"
 * step now — with no email, there is no magic-link flow that could set
 * the password elsewhere.
 *
 * Scoped to the caller's own id: the worst case is a user who skips the
 * change and keeps a credential only they and the clinic ever saw — never
 * a user who rewrites someone else's password.
 */
export async function completePasswordChange(
  input: { password: string },
): Promise<ActionState> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  try {
    const user = await getSessionUser();
    if (!user) {
      return { status: "error", message: "You must be signed in to do that." };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await query(
      `update public.users
          set password_hash = $1, must_change_password = false
        where id = $2`,
      [passwordHash, user.id],
    );

    return { status: "success", message: "Password updated." };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize(
        "completePasswordChange",
        error,
        "Failed to set your password. Please sign out and back in.",
      ),
    };
  }
}
