import { ArrowRight, ClipboardList, NotebookPen, Stethoscope } from "lucide-react";
import Link from "next/link";

import { VisitTypeBadge } from "@/components/portal/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Vitals = {
  blood_pressure?: { systolic: number | null; diastolic: number | null } | null;
  heart_rate_bpm?: number | null;
  temperature_celsius?: number | null;
  respiratory_rate?: number | null;
  weight_kg?: number | null;
  oxygen_saturation_percent?: number | null;
} | null;

type Assessment = {
  summary?: string | null;
  phenomenology?: string | null;
  management_plan?: string | null;
  investigations?: string | null;
  risk_assessment?: string | null;
  prognosis?: string | null;
} | null;

type ConsultationRow = {
  id: string;
  created_at: string;
  vitals: Vitals;
  assessment: Assessment;
  visit_type: "first_visit" | "review";
};

function vitalsSummary(vitals: Vitals): string | null {
  if (!vitals) return null;
  const parts: string[] = [];
  if (vitals.blood_pressure?.systolic && vitals.blood_pressure?.diastolic) {
    parts.push(`BP ${vitals.blood_pressure.systolic}/${vitals.blood_pressure.diastolic}`);
  }
  if (vitals.heart_rate_bpm) parts.push(`HR ${vitals.heart_rate_bpm}`);
  if (vitals.temperature_celsius) parts.push(`Temp ${vitals.temperature_celsius}°C`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export async function ConsultationSnippets({ patientId }: { patientId: string }) {
  const supabase = await createClient();

  const { data: consultations } = await supabase
    .from("consultations")
    .select("id, created_at, vitals, assessment, visit_type")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<ConsultationRow[]>();

  const items = consultations ?? [];

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Stethoscope className="size-4" />
          </div>
          <CardTitle className="text-lg font-bold">Previous Consultations</CardTitle>
        </div>
        {items.length > 0 && (
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Link href={`/admin/consultations/${patientId}?tab=consultation`} scroll={false}>
              <span>View all</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
              <ClipboardList className="size-5 opacity-60" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">No consultations recorded yet.</p>
              <Button asChild size="sm" className="mt-3 shadow-xs shadow-primary/25">
                <Link href={`/admin/consultations/${patientId}/new`} prefetch={true} className="flex items-center gap-1.5">
                  <NotebookPen className="size-3.5" />
                  <span>Record consultation</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const vSummary = vitalsSummary(item.vitals);
              const summaryText =
                item.assessment?.summary ||
                item.assessment?.management_plan ||
                item.assessment?.phenomenology;

              return (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-2xs transition-all duration-200 hover:border-primary/30 hover:shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {formatDateTime(item.created_at)}
                      </p>
                      <VisitTypeBadge visitType={item.visit_type} />
                    </div>

                    {vSummary && (
                      <p className="inline-flex items-center rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                        {vSummary}
                      </p>
                    )}

                    {summaryText ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {summaryText}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/70 italic">
                        Clinical assessment recorded
                      </p>
                    )}
                  </div>

                  <div className="mt-3 border-t border-border/50 pt-2 flex justify-end">
                    <Link
                      href={`/admin/consultations/${patientId}?tab=consultation`}
                      scroll={false}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <span>Full notes</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ConsultationSnippetsSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Previous Consultations</CardTitle>
        <Skeleton className="h-7 w-20 rounded-lg" />
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/80 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
