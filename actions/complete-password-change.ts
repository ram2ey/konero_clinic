"use server";

import type { ActionState } from "@/lib/action-state";
import { logAndSanitize } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Clears the `must_change_password` flag on the calling user, after they
 * have set a new password.
 *
 * This has to be a server action with the service-role client: the flag
 * lives in `app_metadata` precisely because the user cannot write it
 * themselves, which also means they cannot clear it themselves. Without
 * this step the middleware guard would bounce them back to
 * /auth/set-password forever, having already changed their password.
 *
 * It deliberately does NOT verify the password was actually changed —
 * it can't, since Supabase exposes no "when was this password last set"
 * to compare against. What it does verify is that the caller is signed in
 * and clears the flag only for their own id, which is the property that
 * matters: the worst case is a user who skips the change and keeps a
 * credential only they and the clinic ever saw, not a user who clears
 * someone else's flag.
 */
export async function completePasswordChange(): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { status: "error", message: "You must be signed in to do that." };
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      // The existing metadata is spread back in so this is correct whether
      // GoTrue merges the supplied app_metadata into what's stored or
      // replaces it outright. It merges top-level keys today, which would
      // make a bare { must_change_password: false } sufficient — but that
      // is an undocumented implementation detail of the auth service, and
      // relying on it would silently drop `provider`/`providers` and
      // anything added here later if it ever changed.
      app_metadata: { ...user.app_metadata, must_change_password: false },
    });

    if (error) {
      return {
        status: "error",
        message: logAndSanitize(
          "completePasswordChange",
          error,
          "Your password was changed, but finishing setup failed. Please sign out and back in.",
        ),
      };
    }

    return { status: "success", message: "Password updated." };
  } catch (error) {
    return {
      status: "error",
      message: logAndSanitize(
        "completePasswordChange",
        error,
        "Your password was changed, but finishing setup failed. Please sign out and back in.",
      ),
    };
  }
}
