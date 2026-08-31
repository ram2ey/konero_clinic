import { LogOut, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { signOut } from "@/actions/sign-out";
import { AdminHeaderLabel } from "@/components/admin/admin-header-label";
import { AdminNav } from "@/components/admin/admin-nav";
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
import { getCachedAuthUser, getCachedProfile } from "@/lib/auth-cache";

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedAuthUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCachedProfile(user.id);

  if (profile?.role !== "doctor_admin") {
    redirect("/portal");
  }

  const fullName = profile.fullName ?? null;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/70 bg-sidebar">
        <SidebarHeader className="border-b border-border/50 py-3.5 px-3">
          <BrandLogo
            size="default"
            subtitle="Clinical Administration"
            collapseTextOnSidebar
            className="w-full"
          />
        </SidebarHeader>

        <SidebarContent className="p-2">
          <AdminNav />
        </SidebarContent>

        <SidebarFooter className="border-t border-border/50 p-3 space-y-2">
          <div className="flex items-center gap-2.5 px-1 py-1">
            <Avatar className="size-8 shrink-0 ring-1 ring-primary/20 shadow-xs">
              <AvatarFallback className="bg-gradient-to-br from-primary via-blue-800 to-blue-950 text-xs font-bold text-white">
                {initials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">
                {fullName ?? "Konero Clinic"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <ShieldCheck className="size-3 text-primary inline" />
                Doctor / Admin
              </p>
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
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden sm:inline text-xs font-semibold text-muted-foreground">Konero Clinic</span>
              <span className="hidden sm:inline text-muted-foreground/40 text-xs">/</span>
              <AdminHeaderLabel />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="border border-blue-600/25 bg-blue-600/10 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
              Doctor / Admin
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
