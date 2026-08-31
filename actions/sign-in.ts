"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { query } from "@/lib/db";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

// App-level lockout: patient mental-health data, so unlimited password
// guesses against one account shouldn't be possible. Recorded in
// sign_in_attempts, self-pruning per email.
const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

type UserRow = {
  id: string;
  password_hash: string;
  must_change_password: boolean;
};

/**
 * Redirects to /admin on success (the admin layout / middleware bounce a
 * patient session on to /portal). The one exception is
 * must_change_password: a Server Action's own redirect() wins over any the
 * layout would issue for the same fetch, so this handles that case
 * directly — the layouts still enforce it as a backstop for every other
 * navigation.
 */
export async function signIn(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const { email, password } = parsed.data;
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { rows: countRows } = await query<{ n: string }>(
    `select count(*)::text as n
       from public.sign_in_attempts
      where email = $1 and succeeded = false and created_at >= $2`,
    [email, windowStart],
  );
  if (Number(countRows[0]?.n ?? 0) >= MAX_FAILED_ATTEMPTS) {
    return {
      status: "error",
      message: "Too many failed attempts. Please try again in a few minutes.",
    };
  }

  const { rows } = await query<UserRow>(
    `select id, password_hash, must_change_password from public.users where email = $1`,
    [email],
  );
  const user = rows[0];
  const ok = user ? await verifyPassword(user.password_hash, password) : false;

  // Record the attempt and prune this email's rows outside the window in
  // the same round-trip. Best-effort — a logging failure must not block
  // sign-in.
  try {
    await query(
      `insert into public.sign_in_attempts (email, succeeded) values ($1, $2)`,
      [email, ok],
    );
    await query(
      `delete from public.sign_in_attempts where email = $1 and created_at < $2`,
      [email, windowStart],
    );
  } catch {
    // ignored
  }

  if (!ok || !user) {
    // Deliberately generic — doesn't reveal whether the email exists.
    return { status: "error", message: "Invalid email or password." };
  }

  await createSession(user.id);

  if (user.must_change_password) {
    redirect("/auth/set-password");
  }

  redirect("/admin");
}
