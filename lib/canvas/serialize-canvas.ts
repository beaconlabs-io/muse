import { arrowsToEdges, cardsToNodes, edgesToArrows, nodesToCards } from "./react-flow-utils";
import type { CanvasState } from "./storage";

/**
 * dirty 比較用の JSON。DB の jsonb はキー順を並べ替えて返すので、snapshot と同じ
 * 変換（nodesToCards / edgesToArrows）を通してキー順を揃える。cardMetrics は state と
 * 同じオブジェクトがそのまま渡るので変換しない。
 */
export function serializeCanvas(state: CanvasState): string {
  return JSON.stringify({
    cards: nodesToCards(cardsToNodes(state.cards)),
    arrows: edgesToArrows(arrowsToEdges(state.arrows)),
    cardMetrics: state.cardMetrics,
  } satisfies CanvasState);
}
