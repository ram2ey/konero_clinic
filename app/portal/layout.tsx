import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { signOut } from "@/actions/sign-out";
import { PortalNav } from "@/components/portal/portal-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-gold text-sm font-semibold text-brand-gold-foreground">
              C
            </div>
            <span className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Clinic Portal
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <PortalNav />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Avatar className="size-7 shrink-0">
              <AvatarFallback className="bg-brand-gold text-xs text-brand-gold-foreground">
                {initials(fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {fullName ?? "Patient"}
            </span>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start group-data-[collapsible=icon]:justify-center"
            >
              <LogOut />
              <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </Button>
          </form>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          <SidebarTrigger />
          <p className="text-sm font-medium text-foreground">Patient Portal</p>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
