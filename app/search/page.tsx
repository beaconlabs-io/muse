import { SearchPageClient } from "./search-page-client";
import { getAllEvidenceMeta } from "@/lib/evidence";

// TODO： fix page routing to follow nextjs best practice
export default async function SearchPage() {
  const evidence = await getAllEvidenceMeta();

  return <SearchPageClient evidence={evidence} />;
}
