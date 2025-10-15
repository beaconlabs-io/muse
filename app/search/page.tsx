import React from "react";
import { SearchPageClient } from "./search-page-client";
import { getAllEvidenceMeta } from "@/lib/evidence";

export default async function page() {
  const evidence = await getAllEvidenceMeta();

  return <SearchPageClient evidence={evidence} />;
}
