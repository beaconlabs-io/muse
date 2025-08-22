import { Metadata } from "next";
import { CanvasClient } from "@/components/canvas/CanvasClient";
import { getCanvasData } from "@/lib/canvas/server-data";

export const metadata: Metadata = {
  title: "Canvas - MUSE",
  description: "Interactive canvas for creating post-it notes and connecting ideas with arrows",
};

// This is a Server Component that can do SSR
export default async function CanvasPage() {
  // Fetch initial data on the server
  const { cards, arrows } = await getCanvasData();

  return (
    <CanvasClient 
      initialCards={cards}
      initialArrows={arrows}
    />
  );
}