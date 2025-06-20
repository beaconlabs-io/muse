import { silkRoadCase } from "./silk-road-case";
import type { Node, Link } from "@/types";

const randomIntFromInterval = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const colors = ["#88C6FF", "#FF99D2", "#2748A4"];

export const links: Link[] = silkRoadCase.map((d) => ({
  source: d.source,
  target: d.target,
  color: colors[Math.floor(Math.random() * colors.length)],
  width: 1,
}));

export const nodes: Node[] = Array.from(
  new Set([
    ...silkRoadCase.map((d) => d.source),
    ...silkRoadCase.map((d) => d.target),
  ])
).map((id, i) => ({
  id,
  value: i % randomIntFromInterval(0, 10000),
  size: 1,
}));
