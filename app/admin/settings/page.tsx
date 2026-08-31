import { redirect } from "next/navigation";

import { AccountSettingsForm } from "@/components/admin/account-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { query } from "@/lib/db";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { rows } = await query<{ full_name: string | null; phone: string | null }>(
    `select full_name, phone from public.profiles where id = $1`,
    [user.id],
  );
  const profile = rows[0] ?? null;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your clinical administrative profile details and credentials.
        </p>
      </div>

      <Card className="border-border/80 shadow-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-lg font-bold">Doctor Profile</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <AccountSettingsForm
            initialFullName={profile?.full_name ?? ""}
            initialPhone={profile?.phone ?? ""}
            email={user?.email ?? ""}
          />
        </CardContent>
      </Card>
    </main>
  );
}
