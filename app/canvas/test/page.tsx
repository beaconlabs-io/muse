import { ReactFlowCanvas } from "@/components/canvas/ReactFlowCanvas";
import sampleData from "@/sample-logic-model.json";

/**
 * Test page for evidence display on logic model canvas
 *
 * This page loads the sample logic model with mock evidence connections
 * to test and demonstrate the evidence visualization features:
 * - Green arrows for evidence-backed connections
 * - Evidence count badges on cards
 * - Tooltips showing incoming/outgoing evidence counts
 *
 * Access at: http://localhost:3000/canvas/test
 */

// TODO: remove this page
export default function CanvasTestPage() {
  return (
    <div className="h-screen w-full">
      <ReactFlowCanvas
        initialCards={sampleData.cards}
        initialArrows={sampleData.arrows}
        initialCardMetrics={sampleData.cardMetrics as any}
        disableLocalStorage={true}
      />
    </div>
  );
}
