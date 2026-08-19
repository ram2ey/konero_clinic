import { ArrowRight, IdCard, Phone, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateAge, formatDate, formatMedicalId } from "@/lib/format";
import { inputClass } from "@/lib/form-ui";
import { createClient } from "@/lib/supabase/server";

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

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
    .order("created_at", { ascending: false });

  if (query) {
    // Strip PostgREST syntax delimiters and ILIKE wildcards so arbitrary
    // search input cannot trigger a 400 Bad Request or malformed filter.
    const safeQuery = query.replace(/[.,():%\\_]/g, "").trim();
    if (safeQuery) {
      request = request.or(`full_name.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%`);
    }
  }

  const { data: patients } = await request.returns<PatientRow[]>();
  const items = patients ?? [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Patient Consultations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {items.length} patient records. Select a patient to record a clinical consultation or review records.
          </p>
        </div>
        <Button asChild size="default" className="shadow-xs shadow-primary/25">
          <Link href="/admin/consultations/new" prefetch={true} className="flex items-center gap-1.5">
            <UserPlus className="size-4" />
            <span>Register Patient</span>
          </Link>
        </Button>
      </div>

      {/* Search Input */}
      <form className="flex gap-2" action="/admin/consultations">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by patient name..."
            aria-label="Search patients"
            className={`${inputClass} pl-10`}
          />
        </div>
        <Button type="submit" variant="secondary" size="default">
          Search
        </Button>
      </form>

      {/* Patient List */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-4" />
              </div>
              <CardTitle className="text-lg font-bold">Patient Directory</CardTitle>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {items.length} record{items.length === 1 ? "" : "s"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
                <Users className="size-6 opacity-60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-2">
                {query ? `No patients match "${query}".` : "No patients registered yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 space-y-1">
              {items.map((patient) => {
                const name = patient.full_name ?? "Unnamed patient";
                return (
                  <Link
                    key={patient.id}
                    href={`/admin/consultations/${patient.id}`}
                    prefetch={true}
                    className="group flex items-center justify-between gap-3 rounded-xl p-3.5 transition-all duration-150 hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <Avatar className="size-10 shrink-0 ring-1 ring-primary/20 shadow-xs">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 via-violet-500/10 to-brand-gold/20 text-xs font-bold text-foreground">
                          {initials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-primary">
                            <IdCard className="size-3" />
                            {formatMedicalId(patient.id)}
                          </span>
                          {patient.phone && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Phone className="size-3" />
                              {patient.phone}
                            </span>
                          )}
                          {patient.dob && (
                            <span className="text-[11px] text-muted-foreground">
                              &bull; Age {calculateAge(patient.dob)} ({formatDate(patient.dob)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                      <ArrowRight className="size-4" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
