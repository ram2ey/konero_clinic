import { CalendarClock } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Analytics and at-a-glance stats land here next — for now, jump straight to what you need.
        </p>
      </header>

      <div className="max-w-sm">
        <Link href="/admin/consultations">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-muted-foreground" />
                Consultations
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Register a new patient, search the roster, or open a patient&apos;s folder.
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
