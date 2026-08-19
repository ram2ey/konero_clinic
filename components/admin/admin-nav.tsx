"use client";

import { CalendarClock, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const NAV_ITEMS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/consultations", label: "Consultations", icon: CalendarClock },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {NAV_ITEMS.map((item) => {
        // Exact match for "/admin" (else it'd stay "active" on every
        // sub-route); prefix match for the rest so /admin/consultations/[id]
        // still highlights "Consultations".
        const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
