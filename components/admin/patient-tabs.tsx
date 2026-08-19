"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "bio-data", label: "Bio Data" },
  { segment: "history", label: "History" },
  { segment: "financials", label: "Financials" },
  { segment: "", label: "Consultation" },
];

export function PatientTabs({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  const base = `/admin/consultations/${patientId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        // Exact match, not startsWith — Consultation's own segment is ""
        // (the bare patient URL), which is a prefix of every other tab's
        // href, so a prefix check would keep it highlighted everywhere.
        const isActive = pathname === href;

        return (
          <Link
            key={tab.label}
            href={href}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
