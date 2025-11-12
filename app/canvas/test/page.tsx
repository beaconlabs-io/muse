import { ReactFlowCanvas } from "@/components/canvas/ReactFlowCanvas";
import sampleData from "@/sample-logic-model_latest.json";

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
      <div className="absolute top-4 left-4 z-10 max-w-md rounded-lg bg-white/90 p-4 shadow-lg backdrop-blur-sm">
        <h1 className="mb-2 text-lg font-bold text-gray-900">🧪 Evidence Display Test</h1>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <strong>What to look for:</strong>
          </p>
          <ul className="list-inside list-disc space-y-1 text-xs">
            <li>
              <span className="font-semibold text-emerald-600">Green thick arrows</span> =
              Evidence-backed connections
            </li>
            <li>
              <span className="font-semibold text-emerald-600">Green badges</span> on cards =
              Evidence count
            </li>
            <li>
              <strong>Hover badges</strong> to see incoming/outgoing breakdown
            </li>
            <li>
              <strong>5 arrows</strong> have evidence with varying strengths
            </li>
            <li>
              <strong>7 evidence items</strong> total across the model
            </li>
          </ul>
          <div className="mt-2 border-t border-gray-200 pt-2">
            <p className="text-xs text-gray-600">
              Cards with most evidence: <strong>output-1762933553904-0</strong> (3 connections)
            </p>
          </div>
        </div>
      </div>

      <ReactFlowCanvas
        initialCards={sampleData.cards}
        initialArrows={sampleData.arrows}
        initialCardMetrics={sampleData.cardMetrics as any}
        disableLocalStorage={true}
      />
    </div>
  );
}
