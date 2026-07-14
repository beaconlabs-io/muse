import { Hero } from "@/components/hero";
import { getAllEvidenceMeta } from "@/lib/evidence";

export default function Home() {
  const latestEvidence = getAllEvidenceMeta()
    .slice()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 3);

  return (
    <main>
      <Hero latestEvidence={latestEvidence} />
    </main>
  );
}
