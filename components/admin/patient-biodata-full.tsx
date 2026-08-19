import {
  Briefcase,
  CalendarDays,
  Church,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  IdCard,
  MapPin,
  Phone,
  Send,
  User,
  Users,
  UsersRound,
  VenusAndMars,
} from "lucide-react";

import { FieldRow } from "@/components/field-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <FieldRow icon={Briefcase} label="Occupation" value={profile?.occupation ?? "Not on file"} />
        <FieldRow icon={GraduationCap} label="Highest education" value={profile?.education_level ?? "Not on file"} />
        <FieldRow icon={Church} label="Religion / faith" value={profile?.religion ?? "Not on file"} />
        <FieldRow icon={Users} label="Ethnicity" value={profile?.ethnicity ?? "Not on file"} />
        <FieldRow icon={Globe} label="Nationality" value={profile?.nationality ?? "Not on file"} />
        <FieldRow icon={MapPin} label="Place of residence" value={profile?.residence ?? "Not on file"} />
        <FieldRow icon={IdCard} label="Medical ID" value={formatMedicalId(patientId)} />

        <div className="sm:col-span-2">
          <Separator className="mb-4" />
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Next of kin</p>
          <FieldRow icon={UsersRound} label="Contact" value={nextOfKinValue(profile)} />
        </div>

        <div className="sm:col-span-2">
          <Separator className="mb-4" />
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Informant</p>
          <div className="flex items-start justify-between gap-3">
            <FieldRow icon={User} label="Informant" value={informantValue(profile)} />
            {profile?.informant_reliability && (
              <InformantReliabilityBadge reliability={profile.informant_reliability} />
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Separator className="mb-4" />
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Referral</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow icon={Send} label="Referral source" value={profile?.referral_source ?? "Not on file"} />
            <FieldRow icon={FileText} label="Reason for referral" value={profile?.referral_reason ?? "Not on file"} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PatientBiodataFullSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 12 }).map((_, i) => (
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
