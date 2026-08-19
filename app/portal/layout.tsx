import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { signOut } from "@/actions/sign-out";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // getSession() (a local cookie decode) rather than getUser() (a network
  // round-trip that revalidates against Supabase Auth): this belt-and-
  // suspenders check runs on every single portal navigation, and
  // middleware.ts already did the authoritative getUser() revalidation
  // for this exact request — and redirects away anything invalid before
  // this layout ever runs. Re-deriving user.id from that already-trusted
  // session costs nothing extra; re-validating it a second time over the
  // network on every page load did. This safely relies on middleware
  // being the actual gate — if its matcher ever stops covering /portal,
  // this check alone wouldn't be enough. RLS is the real data-access
  // boundary regardless of any of this (see supabase/migrations), so a
  // misconfigured matcher would show the wrong UI shell, not leak data.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // `role` alongside `full_name` in the same query (no extra round trip):
  // middleware no longer redirects an admin away from /portal on every
  // request (see middleware.ts), so this layout is now the one place that
  // still has to catch it — same role check app/admin/layout.tsx already
  // does in the other direction.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", session.user.id)
    .single<{ full_name: string | null; role: string }>();

  if (profile?.role === "doctor_admin") {
    redirect("/admin");
  }

  const fullName = profile?.full_name ?? null;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/70 bg-sidebar">
        <SidebarHeader className="border-b border-border/50 py-3">
          <div className="flex items-center px-1">
            <BrandLogo
              size="sm"
              subtitle="Patient Portal"
              collapseTextOnSidebar
              className="w-full"
            />
          </div>
        </SidebarHeader>

        {/* The dashboard's sections live behind tabs (see
            app/portal/page.tsx), not per-section sidebar links — /portal is
            still this app's only portal route. Kept as an empty flex-1 spacer so the
            footer (avatar + sign out) stays pinned to the bottom. */}
        <SidebarContent />

        <SidebarFooter className="border-t border-border/50 p-3 space-y-2">
          <div className="flex items-center gap-2.5 px-1 py-1">
            <Avatar className="size-8 shrink-0 ring-1 ring-primary/20 shadow-xs">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 via-violet-500/10 to-brand-gold/20 text-xs font-bold text-foreground">
                {initials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">
                {fullName ?? "Patient"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground font-medium">Patient Account</p>
            </div>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:justify-center transition-colors"
            >
              <LogOut className="size-3.5" />
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </Button>
          </form>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        <header className="glass-header flex h-14 shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="hover:bg-muted/70 rounded-lg p-1.5" />
            <div className="h-4 w-px bg-border/80" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Dr. Alex Vico-Korda</span>
              <span className="text-muted-foreground/40 text-xs">/</span>
              <span className="text-xs sm:text-sm font-bold text-foreground">Patient Health Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Patient
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
