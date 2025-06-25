import React from "react";
import { GraphVisualization } from "@/components/graph/graph-visualization";

export default function GraphViewPage() {
  return (
    <main>
      {/* TODO: remove this line */}
      <h1 className="text-2xl font-bold p-4 text-red-500">
        This is not actual data
      </h1>

      <div>
        <GraphVisualization />
      </div>
    </main>
  );
}
