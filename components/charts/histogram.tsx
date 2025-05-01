"use client";

import React from "react";
import {
  VictoryChart,
  VictoryGroup,
  VictoryHistogram,
  VictoryLine,
  VictoryScatter,
  VictoryTheme,
} from "victory";

// Docs: https://nearform.com/open-source/victory/docs/charts/histogram
export function Histogram({ data }: { data: { x: number }[] }) {
  return (
    <VictoryChart domainPadding={20} theme={VictoryTheme.clean}>
      <VictoryGroup
        data={[
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 3 },
          { x: 3, y: 2 },
          { x: 4, y: 5 },
          { x: 5, y: 5 },
          { x: 6, y: 4 },
          { x: 7, y: 8 },
          { x: 8, y: 6 },
          { x: 9, y: 3 },
          { x: 10, y: 7 },
        ]}
      >
        <VictoryLine />
        <VictoryScatter />
      </VictoryGroup>
      <VictoryHistogram data={data} />
    </VictoryChart>
  );
}
