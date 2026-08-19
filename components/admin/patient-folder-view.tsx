"use client";

import { History, Receipt, Stethoscope, User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "consultation", label: "Consultation", icon: Stethoscope },
  { value: "bio-data", label: "Bio Data", icon: User },
  { value: "history", label: "History", icon: History },
  { value: "financials", label: "Financials", icon: Receipt },
];

export function PatientFolderView({
  consultationsNode,
  bioDataNode,
  historyNode,
  financialsNode,
  defaultTab = "consultation",
}: {
  patientId: string;
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
    if (nextTab === "consultation") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", nextTab);
    }
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <TabsList className="w-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              <tab.icon className="size-3.5" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

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
