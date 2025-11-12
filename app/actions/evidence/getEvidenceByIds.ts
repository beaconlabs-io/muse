"use server";

import type { Evidence } from "@/types";
import { getEvidenceByIds } from "@/lib/evidence";

export async function fetchEvidenceByIds(ids: string[]): Promise<Evidence[]> {
  try {
    return await getEvidenceByIds(ids);
  } catch (error) {
    console.error("Error fetching evidence by IDs:", error);
    return [];
  }
}
