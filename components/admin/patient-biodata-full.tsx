import {
  Briefcase,
  CalendarDays,
  Church,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  IdCard,
  KeyRound,
  MapPin,
  Phone,
  Send,
  User,
  Users,
  UsersRound,
  VenusAndMars,
} from "lucide-react";

import { FieldRow } from "@/components/field-row";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateAge, formatDate, formatMedicalId, humanizeEnum } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { InformantReliabilityBadge } from "@/components/portal/status-badge";

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
  informant_name: string | null;
  informant_relationship: string | null;
  informant_reliability: "reliable" | "partially_reliable" | "unreliable" | null;
  referral_source: string | null;
  referral_reason: string | null;
};

const PROFILE_COLUMNS =
  "full_name, phone, dob, sex, gender_identity, marital_status, occupation, education_level, religion, ethnicity, nationality, residence, next_of_kin_name, next_of_kin_relationship, next_of_kin_contact, informant_name, informant_relationship, informant_reliability, referral_source, referral_reason";

function nextOfKinValue(profile: Profile | null): string {
  if (!profile?.next_of_kin_name) return "Not on file";
  const parts = [profile.next_of_kin_name];
  if (profile.next_of_kin_relationship) parts.push(`(${profile.next_of_kin_relationship})`);
  const line = parts.join(" ");
  return profile.next_of_kin_contact ? `${line} · ${profile.next_of_kin_contact}` : line;
}

function informantValue(profile: Profile | null): string {
  if (!profile?.informant_name) return "Not on file";
  return profile.informant_relationship
    ? `${profile.informant_name} (${profile.informant_relationship})`
    : profile.informant_name;
}

/**
 * Admin-only counterpart to components/portal/bio-data-card.tsx — includes
 * everything that one intentionally omits (informant details, referral
 * reason). Those are clinical intake judgments about the visit, not the
 * patient's own core data, so they're kept out of the patient-facing view.
 */
export async function PatientBiodataFull({ patientId }: { patientId: string }) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", patientId)
    .single<Profile>();

  const ageText = profile?.dob ? `${calculateAge(profile.dob)} yrs` : null;

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-violet-500/15 to-primary/5 text-primary ring-1 ring-primary/25">
                <User className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                  {profile?.full_name ?? "Patient Clinical File"}
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
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    <IdCard className="size-3" />
                    {formatMedicalId(patientId)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ResetPasswordButton
                patientId={patientId}
                patientName={profile?.full_name}
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Patient Portal Access Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <KeyRound className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Patient Portal Access</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Issue a new temporary password if the patient can&apos;t sign in. They&apos;ll choose
                  their own the next time they log in.
                </p>
              </div>
            </div>
            <ResetPasswordButton
              patientId={patientId}
              patientName={profile?.full_name}
              variant="default"
              size="sm"
            />
          </div>

          {/* Demographics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Demographics &amp; Core Identity
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

          {/* Location & Socioeconomic */}
          <div className="border-t border-border/60 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
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

          {/* Next of Kin & Informant */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-border/60 pt-5">
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Next of Kin
              </h3>
              <FieldRow icon={UsersRound} label="Contact" value={nextOfKinValue(profile)} />
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Informant Details
                </h3>
                {profile?.informant_reliability && (
                  <InformantReliabilityBadge reliability={profile.informant_reliability} />
                )}
              </div>
              <FieldRow icon={User} label="Informant" value={informantValue(profile)} />
            </div>
          </div>

          {/* Referral Intake */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Clinical Referral Intake
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldRow icon={Send} label="Referral source" value={profile?.referral_source ?? "Not on file"} />
              <FieldRow icon={FileText} label="Reason for referral" value={profile?.referral_reason ?? "Not on file"} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PatientBiodataFullSkeleton() {
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
