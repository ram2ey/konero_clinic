import { Users } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateAge, formatDate, formatMedicalId } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type PatientRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  dob: string | null;
};

const RECENT_LIMIT = 5;

export async function RecentPatients() {
  const supabase = await createClient();

  const { data: patients } = await supabase
    .from("profiles")
    .select("id, full_name, phone, dob")
    .eq("role", "patient")
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT)
    .returns<PatientRow[]>();

  const items = patients ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently registered</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Users className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No patients registered yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((patient) => {
              const name = patient.full_name ?? "Unnamed patient";
              return (
                <li key={patient.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/admin/consultations/${patient.id}`} className="block">
                    <p className="truncate font-medium text-foreground hover:underline">{name}</p>
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
  );
}

export function RecentPatientsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently registered</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: RECENT_LIMIT }).map((_, i) => (
          <div key={i}>
            {i > 0 && <Separator className="mb-3" />}
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
