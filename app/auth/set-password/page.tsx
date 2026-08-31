import { redirect } from "next/navigation";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getSessionUser } from "@/lib/auth/session";

/**
 * A patient onboarded with a temporary password lands here (redirected by
 * the sign-in action or a layout). With no reset email there is no other
 * way in — so this is a plain server-gated page: not signed in → /login;
 * already changed the password → /portal; otherwise show the form.
 */
export default async function SetPasswordPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }
  if (!user.mustChangePassword) {
    redirect(user.role === "doctor_admin" ? "/admin" : "/portal");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Set your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Finish setting up your account to access your patient portal.
        </p>
        <SetPasswordForm />
      </div>
    </main>
  );
}
