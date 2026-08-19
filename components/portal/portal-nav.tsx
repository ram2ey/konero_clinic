"use client";

import { FileText, LayoutDashboard, Pill, Receipt, Stethoscope } from "lucide-react";
import type { ComponentType } from "react";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

const NAV_ITEMS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "#overview", label: "Overview", icon: LayoutDashboard },
  { href: "#medications", label: "Medications", icon: Pill },
  { href: "#diagnoses", label: "Diagnoses", icon: Stethoscope },
  { href: "#financials", label: "Financials", icon: Receipt },
  { href: "#lab-reports", label: "Lab Reports", icon: FileText },
];

export function PortalNav() {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {NAV_ITEMS.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild tooltip={item.label}>
            {/* These are same-page hash scrolls, not route changes, so
                there's no navigation to signal "you're done" — closing
                the mobile drawer here matters even more than it does
                for the admin nav's real page transitions. */}
            <a href={item.href} onClick={() => setOpenMobile(false)}>
              <item.icon />
              <span>{item.label}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
