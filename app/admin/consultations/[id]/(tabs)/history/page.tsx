import { redirect } from "next/navigation";

export default async function HistoryTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  redirect(`/admin/consultations/${patientId}?tab=history`);
}
