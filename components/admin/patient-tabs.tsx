"use client";

import { History, Receipt, Stethoscope, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "bio-data", label: "Bio Data", icon: User },
  { segment: "history", label: "History", icon: History },
  { segment: "financials", label: "Financials", icon: Receipt },
  { segment: "", label: "Consultation", icon: Stethoscope },
];

export function PatientTabs({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  const base = `/admin/consultations/${patientId}`;

  return (
    <div className="overflow-x-auto pb-1 scrollbar-none">
      <nav className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-muted/60 p-1 shadow-xs">
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
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 outline-none select-none ${
                isActive
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              }`}
            >
              <tab.icon className={`size-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
