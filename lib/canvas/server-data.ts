import { PostItCard, Arrow } from "@/types";

// Server-side data fetching functions
export async function getCanvasData(): Promise<{
  cards: PostItCard[];
  arrows: Arrow[];
}> {
  // Start with an empty canvas - users will add evidence cards themselves
  return {
    cards: [],
    arrows: [],
  };
}

// Helper function to validate canvas data
export function validateCanvasData(data: unknown): data is { cards: PostItCard[]; arrows: Arrow[] } {
  if (!data || typeof data !== "object") return false;
  
  const { cards, arrows } = data as any;
  
  if (!Array.isArray(cards) || !Array.isArray(arrows)) return false;
  
  // Basic validation for cards
  const validCards = cards.every((card: any) => 
    typeof card.id === "string" &&
    typeof card.x === "number" &&
    typeof card.y === "number" &&
    typeof card.content === "string" &&
    typeof card.color === "string"
  );
  
  // Basic validation for arrows
  const validArrows = arrows.every((arrow: any) =>
    typeof arrow.id === "string" &&
    typeof arrow.fromCardId === "string" &&
    typeof arrow.toCardId === "string"
  );
  
  return validCards && validArrows;
}