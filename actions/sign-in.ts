"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/zod-field-errors";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

/**
 * Redirects to /admin unconditionally on success rather than branching on
 * role here — middleware already owns that decision (it bounces a
 * non-admin session straight to /portal), so this avoids a second,
 * potentially-drifting copy of the same routing rule.
 */
export async function signIn(_prevState: ActionState, formData: FormData): Promise<ActionState> {
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately generic — doesn't reveal whether the email exists.
    return { status: "error", message: "Invalid email or password." };
  }

  redirect("/admin");
}
