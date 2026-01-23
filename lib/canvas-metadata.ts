import { fetchFromIPFS } from "@/utils/ipfs";

export interface CanvasMetadata {
  title: string;
  cardCount: number;
  description: string;
}

const DEFAULT_TITLE = "Logic Model Canvas";

/**
 * Fetch canvas metadata from IPFS
 *
 * Extracts title from the first activity card, falling back to default.
 * Used by both generateMetadata and OG image generation.
 */
export async function getCanvasMetadata(cid: string): Promise<CanvasMetadata> {
  try {
    const canvasData = await fetchFromIPFS(cid);
    const cardCount = canvasData.cards?.length || 0;

    // Get title from first activity card
    const activityCard = canvasData.cards?.find((c) => c.type === "activities");
    // Sanitize and truncate to prevent content injection
    const title = activityCard?.title
      ? activityCard.title.slice(0, 200).replace(/[<>]/g, "")
      : DEFAULT_TITLE;

    const description = `Logic model with ${cardCount} card${cardCount !== 1 ? "s" : ""} on MUSE`;

    return { title, cardCount, description };
  } catch (error) {
    console.error("Failed to fetch canvas metadata:", error);
    return {
      title: DEFAULT_TITLE,
      cardCount: 0,
      description: "Interactive logic model on MUSE",
    };
  }
}
