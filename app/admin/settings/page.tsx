import { AccountSettingsForm } from "@/components/admin/account-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user?.id ?? "")
    .single<{ full_name: string | null; phone: string | null }>();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Your account details.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>My Account</CardTitle>
        </CardHeader>
        <CardContent>
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
