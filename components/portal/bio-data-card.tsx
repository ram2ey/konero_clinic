import { CalendarDays, IdCard, Phone, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateAge, formatDate, formatMedicalId } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  full_name: string | null;
  phone: string | null;
  dob: string | null;
};

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export async function BioDataCard({ patientId }: { patientId: string }) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, dob")
    .eq("id", patientId)
    .single<Profile>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field icon={User} label="Full name" value={profile?.full_name ?? "Not on file"} />
        <Field
          icon={CalendarDays}
          label="Date of birth"
          value={profile?.dob ? `${formatDate(profile.dob)} (age ${calculateAge(profile.dob)})` : "Not on file"}
        />
        <Field icon={Phone} label="Phone" value={profile?.phone ?? "Not on file"} />
        <Field icon={IdCard} label="Medical ID" value={formatMedicalId(patientId)} />
      </CardContent>
    </Card>
  );
}

export function BioDataCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-4 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
