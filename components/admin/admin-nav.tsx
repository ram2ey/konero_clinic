"use client";

import { CalendarClock, FileText, LayoutDashboard, Receipt, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

const NAV_ITEMS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/consultations", label: "Consultations", icon: CalendarClock },
  { href: "/admin/billing", label: "Billing", icon: Receipt },
  { href: "/admin/lab-reports", label: "Lab Reports", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu className="gap-1">
      {NAV_ITEMS.map((item) => {
        // Exact match for "/admin" (else it'd stay "active" on every
        // sub-route); prefix match for the rest so /admin/consultations/[id]
        // still highlights "Consultations".
        const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.label}
              className="relative h-9 rounded-lg px-2.5 transition-all duration-150 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold dark:data-[active=true]:bg-primary/20 hover:bg-muted/70"
            >
              {/* Closes the mobile drawer on tap — otherwise it stays open
                  over the destination page until manually dismissed. */}
              <Link href={item.href} onClick={() => setOpenMobile(false)} className="flex items-center gap-2.5">
                <item.icon className="size-4 shrink-0" />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <span className="ml-auto size-1.5 rounded-full bg-primary group-data-[collapsible=icon]:hidden" />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
