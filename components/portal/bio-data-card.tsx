import {
  Briefcase,
  CalendarDays,
  Church,
  Globe,
  GraduationCap,
  Heart,
  IdCard,
  MapPin,
  Phone,
  ShieldAlert,
  User,
  Users,
  UsersRound,
  VenusAndMars,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldRow } from "@/components/field-row";
import { query } from "@/lib/db";
import { calculateAge, formatDate, formatMedicalId, humanizeEnum } from "@/lib/format";

type Profile = {
  full_name: string | null;
  phone: string | null;
  dob: string | null;
  sex: string | null;
  gender_identity: string | null;
  marital_status: string | null;
  occupation: string | null;
  education_level: string | null;
  religion: string | null;
  ethnicity: string | null;
  nationality: string | null;
  residence: string | null;
  next_of_kin_name: string | null;
  next_of_kin_relationship: string | null;
  next_of_kin_contact: string | null;
};

const PROFILE_COLUMNS =
  "full_name, phone, dob, sex, gender_identity, marital_status, occupation, education_level, religion, ethnicity, nationality, residence, next_of_kin_name, next_of_kin_relationship, next_of_kin_contact";

function nextOfKinValue(profile: Profile | null): string {
  if (!profile?.next_of_kin_name) return "Not on file";
  const parts = [profile.next_of_kin_name];
  if (profile.next_of_kin_relationship) parts.push(`(${profile.next_of_kin_relationship})`);
  const line = parts.join(" ");
  return profile.next_of_kin_contact ? `${line} · ${profile.next_of_kin_contact}` : line;
}

export async function BioDataCard({ patientId }: { patientId: string }) {
  const { rows } = await query<Profile>(
    `select ${PROFILE_COLUMNS} from public.profiles where id = $1`,
    [patientId],
  );
  const profile = rows[0] ?? null;

  const ageText = profile?.dob ? `${calculateAge(profile.dob)} yrs` : null;

  return (
    <div className="space-y-6">
      {/* Patient Profile Header Card */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 via-primary to-blue-900 text-white font-bold shadow-md shadow-primary/25 ring-1 ring-white/30">
                <User className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-extrabold text-foreground">
                  {profile?.full_name ?? "Patient Information"}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {ageText && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {ageText}
                    </span>
                  )}
                  {profile?.sex && (
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {humanizeEnum(profile.sex)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                    <IdCard className="size-3" />
                    {formatMedicalId(patientId)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Section: Personal & Demographics */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary mb-3.5">
              Personal &amp; Demographics
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldRow icon={User} label="Full name" value={profile?.full_name ?? "Not on file"} />
              <FieldRow
                icon={CalendarDays}
                label="Date of birth"
                value={profile?.dob ? `${formatDate(profile.dob)} (age ${calculateAge(profile.dob)})` : "Not on file"}
              />
              <FieldRow icon={VenusAndMars} label="Sex" value={humanizeEnum(profile?.sex)} />
              <FieldRow icon={UsersRound} label="Gender identity" value={humanizeEnum(profile?.gender_identity)} />
              <FieldRow icon={Heart} label="Marital status" value={humanizeEnum(profile?.marital_status)} />
              <FieldRow icon={Phone} label="Phone" value={profile?.phone ?? "Not on file"} />
            </div>
          </div>

          {/* Section: Residence & Background */}
          <div className="border-t border-border/60 pt-5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary mb-3.5">
              Location &amp; Socioeconomic
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldRow icon={MapPin} label="Place of residence" value={profile?.residence ?? "Not on file"} />
              <FieldRow icon={Globe} label="Nationality" value={profile?.nationality ?? "Not on file"} />
              <FieldRow icon={Users} label="Ethnicity" value={profile?.ethnicity ?? "Not on file"} />
              <FieldRow icon={Church} label="Religion / Faith" value={profile?.religion ?? "Not on file"} />
              <FieldRow icon={Briefcase} label="Occupation" value={profile?.occupation ?? "Not on file"} />
              <FieldRow icon={GraduationCap} label="Highest education" value={profile?.education_level ?? "Not on file"} />
            </div>
          </div>

          {/* Section: Emergency & Next of Kin */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <ShieldAlert className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Emergency Contact / Next of Kin
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {nextOfKinValue(profile)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function BioDataCardSkeleton() {
  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-60" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-7 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
