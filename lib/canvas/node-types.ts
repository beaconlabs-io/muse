import { Package, Sparkles, Target, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NodeTypeValue =
  | "activities"
  | "outputs"
  | "outcomes-short"
  | "outcomes-intermediate"
  | "impact";

export type NodeTypeI18nKey =
  | "activities"
  | "outputs"
  | "outcomesShort"
  | "outcomesIntermediate"
  | "impact";

export interface NodeTypeConfig {
  value: NodeTypeValue;
  i18nKey: NodeTypeI18nKey;
  icon: LucideIcon;
}

// Ordered list — drives the editor dropdown and matches canvas stage order.
export const NODE_TYPES: readonly NodeTypeConfig[] = [
  { value: "activities", i18nKey: "activities", icon: Zap },
  { value: "outputs", i18nKey: "outputs", icon: Package },
  { value: "outcomes-short", i18nKey: "outcomesShort", icon: Target },
  { value: "outcomes-intermediate", i18nKey: "outcomesIntermediate", icon: Target },
  { value: "impact", i18nKey: "impact", icon: Sparkles },
] as const;

// O(1) lookup by value — used by CardNode to resolve label + icon.
export const NODE_TYPE_MAP: Record<NodeTypeValue, NodeTypeConfig> = Object.fromEntries(
  NODE_TYPES.map((t) => [t.value, t]),
) as Record<NodeTypeValue, NodeTypeConfig>;
