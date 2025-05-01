"use client";
import React from "react";
import { VictoryChart, VictoryBoxPlot, VictoryTheme } from "victory";

// Docs: https://nearform.com/open-source/victory/docs/charts/box-plot
export function BoxPlot() {
  return (
    <VictoryChart domainPadding={20} theme={VictoryTheme.clean}>
      <VictoryBoxPlot
        boxWidth={15}
        data={[
          { x: 1, y: ["2", "3", "5", "8"] },
          { x: 2, y: ["1", "3", "5", "8"] },
          { x: 3, y: ["2", "5", "7", "9"] },
          { x: 4, y: ["4", "6", "7", "9"] },
          { x: 5, y: ["1", "2", "4", "5"] },
          { x: 6, y: ["1", "2", "6", "8"] },
          { x: 7, y: ["2", "4", "5", "8"] },
          { x: 8, y: ["1", "4", "4", "7"] },
          { x: 9, y: ["2", "5", "7", "9"] },
        ]}
      />
    </VictoryChart>
  );
}
