import { Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateAge, formatDate, formatMedicalId } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type PatientRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  dob: string | null;
};

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();

  let request = supabase
    .from("profiles")
    .select("id, full_name, phone, dob")
    .eq("role", "patient")
    // Most-recently-registered first — no formal "waiting" queue, but this
    // naturally surfaces newer/active patients ahead of the full history
    // instead of forcing an alphabetical scroll.
    .order("created_at", { ascending: false });

  if (query) {
    // PostgREST's .or() takes a raw filter string, not a parameterized
    // value — strip characters that have syntactic meaning there (comma
    // separates conditions, parens group them) so a search containing
    // one can't reshape the filter. RLS still fully applies underneath
    // regardless, so this is a correctness guard, not a security one.
    const safeQuery = query.replace(/[,()%]/g, "");
    request = request.or(`full_name.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%`);
  }

  const { data: patients } = await request.returns<PatientRow[]>();
  const items = patients ?? [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Consultations</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} patients on record. Click one to open their folder.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/consultations/new">
            <UserPlus className="size-3.5" />
            Register patient
          </Link>
        </Button>
      </header>

      <form className="flex gap-2" action="/admin/consultations">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by name or phone"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground"
          />
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Users className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {query ? `No patients match "${query}".` : "No patients registered yet."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((patient) => {
                const name = patient.full_name ?? "Unnamed patient";
                return (
                  <li key={patient.id} className="py-3 first:pt-0 last:pb-0">
                    <Link href={`/admin/consultations/${patient.id}`} className="block">
                      <p className="truncate font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMedicalId(patient.id)}
                        {patient.phone ? ` · ${patient.phone}` : ""}
                        {patient.dob ? ` · Age ${calculateAge(patient.dob)} (${formatDate(patient.dob)})` : ""}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
