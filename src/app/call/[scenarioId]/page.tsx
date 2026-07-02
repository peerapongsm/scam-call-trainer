import { notFound } from "next/navigation";
import { CallGame } from "@/components/CallGame";
import { getScenarioById, SCENARIOS } from "@/data";

export function generateStaticParams() {
  return SCENARIOS.map((s) => ({ scenarioId: s.id }));
}

export default async function CallPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  const scenario = getScenarioById(scenarioId);
  if (!scenario) notFound();
  return <CallGame scenario={scenario} />;
}
