import { redirect } from "next/navigation";

export default async function FinancialsTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  redirect(`/admin/consultations/${patientId}?tab=financials`);
}
