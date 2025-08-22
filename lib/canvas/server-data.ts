import { PostItCard, Arrow, CARD_COLORS } from "@/types";

// Server-side data fetching functions
export async function getCanvasData(): Promise<{
  cards: PostItCard[];
  arrows: Arrow[];
}> {
  // In a real app, this would fetch from a database
  // For now, return default data that can be SSR'd
  const defaultCards: PostItCard[] = [
    // Activities Section
    {
      id: "activity-1",
      x: 100,
      y: 150,
      content: "Research evidence\ncollection",
      color: CARD_COLORS[3], // blue
    },
    {
      id: "activity-2",
      x: 100,
      y: 300,
      content: "Policy development\nworkshops",
      color: CARD_COLORS[3], // blue
    },
    
    // Outputs Section
    {
      id: "output-1",
      x: 450,
      y: 150,
      content: "Evidence database\nwith attestations",
      color: CARD_COLORS[4], // green
    },
    {
      id: "output-2",
      x: 450,
      y: 300,
      content: "Policy proposal\ndocuments",
      color: CARD_COLORS[4], // green
    },
    
    // Outcomes Section
    {
      id: "outcome-1",
      x: 800,
      y: 200,
      content: "Improved policy\ndecision making",
      color: CARD_COLORS[0], // yellow
    },
    
    // Impact Section
    {
      id: "impact-1",
      x: 1150,
      y: 200,
      content: "Better societal\noutcomes",
      color: CARD_COLORS[5], // purple
    }
  ];

  const defaultArrows: Arrow[] = [
    {
      id: "activity-to-output-1",
      fromCardId: "activity-1",
      toCardId: "output-1",
    },
    {
      id: "activity-to-output-2", 
      fromCardId: "activity-2",
      toCardId: "output-2",
    },
    {
      id: "output-to-outcome-1",
      fromCardId: "output-1",
      toCardId: "outcome-1",
    },
    {
      id: "output-to-outcome-2",
      fromCardId: "output-2", 
      toCardId: "outcome-1",
    },
    {
      id: "outcome-to-impact",
      fromCardId: "outcome-1",
      toCardId: "impact-1",
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