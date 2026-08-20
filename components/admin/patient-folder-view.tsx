"use client";

import { History, LayoutDashboard, Receipt, Stethoscope, User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// "history" is deliberately not a nav button: the full clerking history
// lives inside the Consultation form's own History section for a first
// visit. This entry stays here only so a review visit's "History tab"
// link (record-consultation-form.tsx) still lands on real content instead
// of falling back to the default tab.
const TABS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "consultation", label: "Consultation", icon: Stethoscope },
  { value: "bio-data", label: "Bio Data", icon: User },
  { value: "history", label: "History", icon: History, hidden: true },
  { value: "financials", label: "Financials", icon: Receipt },
];

export function PatientFolderView({
  overviewNode,
  consultationsNode,
  bioDataNode,
  historyNode,
  financialsNode,
  defaultTab = "overview",
}: {
  patientId: string;
  overviewNode: ReactNode;
  consultationsNode: ReactNode;
  bioDataNode: ReactNode;
  historyNode: ReactNode;
  financialsNode: ReactNode;
  defaultTab?: string;
}) {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const initialTab = urlTab && TABS.some((t) => t.value === urlTab) ? urlTab : defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab);

  function handleTabChange(nextTab: string) {
    setActiveTab(nextTab);
    const url = new URL(window.location.href);
    if (nextTab === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", nextTab);
    }
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="w-auto">
        {TABS.filter((tab) => !tab.hidden).map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
            <tab.icon className="size-3.5" />
            <span>{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" forceMount>
        {overviewNode}
      </TabsContent>

      <TabsContent value="consultation" forceMount>
        {consultationsNode}
      </TabsContent>

      <TabsContent value="bio-data" forceMount>
        {bioDataNode}
      </TabsContent>

      <TabsContent value="history" forceMount>
        {historyNode}
      </TabsContent>

      <TabsContent value="financials" forceMount>
        {financialsNode}
      </TabsContent>
    </Tabs>
  );
}
