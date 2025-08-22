import { PostItCard, Arrow, CARD_COLORS } from "@/types";

// Server-side data fetching functions
export async function getCanvasData(): Promise<{
  cards: PostItCard[];
  arrows: Arrow[];
}> {
  // In a real app, this would fetch from a database
  // For now, return default data that can be SSR'd
  const defaultCards: PostItCard[] = [
    {
      id: "welcome-card",
      x: 200,
      y: 150,
      content: "Welcome to Canvas!\n\nDouble-click to edit\nDrag to move\nClick + to connect",
      color: CARD_COLORS[0],
    },
    {
      id: "features-card", 
      x: 450,
      y: 250,
      content: "Canvas Features:\n• Post-it notes\n• Drag & drop\n• Arrow connections\n• Zoom & pan",
      color: CARD_COLORS[2],
    }
  ];

  const defaultArrows: Arrow[] = [
    {
      id: "welcome-arrow",
      fromCardId: "welcome-card",
      toCardId: "features-card",
    }
  ];

  return {
    cards: defaultCards,
    arrows: defaultArrows,
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