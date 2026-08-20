"use client";

import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/admin/admin-nav";

// Same exact/prefix match AdminNav uses to highlight the active sidebar
// item, so the header label and the sidebar never disagree about where
// you are.
export function AdminHeaderLabel() {
  const pathname = usePathname();
  const active = NAV_ITEMS.find((item) =>
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
  );

  return (
    <span className="truncate text-xs sm:text-sm font-bold text-foreground">
      {active?.label ?? "Clinical Administration"}
    </span>
  );
}
