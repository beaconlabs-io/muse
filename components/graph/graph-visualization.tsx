"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  CosmographProvider,
  Cosmograph,
  CosmographSearch,
  CosmographRef,
  CosmographSearchRef,
  CosmographSearchInputConfig,
  CosmographInputConfig,
} from "@cosmograph/react";
import { scaleSymlog } from "d3-scale";
import { nodes, links } from "./data";
import type { Node, Link } from "@/types";

export function GraphVisualization() {
  const cosmograph = useRef<CosmographRef>(undefined);
  const search = useRef<CosmographSearchRef>(undefined);
  const [degree, setDegree] = useState<number[]>([]);

  const scaleColor = useRef(
    scaleSymlog<string, string>()
      .range(["rgba(80, 105, 180, 0.75)", "rgba(240, 105, 180, 0.75)"])
      .clamp(true)
  );

  useEffect(() => {
    const degree = cosmograph?.current?.getNodeDegrees();
    if (degree) {
      scaleColor.current.domain([Math.min(...degree), Math.max(...degree)]);
      setDegree(degree);
    }
  }, [degree]);

  const [showLabelsFor, setShowLabelsFor] = useState<Node[] | undefined>(
    undefined
  );
  const [selectedNode, setSelectedNode] = useState<Node | undefined>();

  const onCosmographClick = useCallback<
    Exclude<CosmographInputConfig<Node, Link>["onClick"], undefined>
  >((n) => {
    search?.current?.clearInput();
    if (n) {
      cosmograph.current?.selectNode(n);
      setShowLabelsFor([n]);
      setSelectedNode(n);
    } else {
      cosmograph.current?.unselectNodes();
      setShowLabelsFor(undefined);
      setSelectedNode(undefined);
    }
  }, []);

  const onSearchSelectResult = useCallback<
    Exclude<CosmographSearchInputConfig<Node>["onSelectResult"], undefined>
  >((n) => {
    setShowLabelsFor(n ? [n] : undefined);
    setSelectedNode(n);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#222222]">
      <CosmographProvider nodes={nodes} links={links}>
        <CosmographSearch
          ref={search}
          className="mx-4"
          onSelectResult={onSearchSelectResult}
          maxVisibleItems={20}
        />
        <Cosmograph
          ref={cosmograph}
          className="flex overflow-auto h-full"
          showTopLabels
          showLabelsFor={showLabelsFor}
          nodeLabelColor={"white"}
          hoveredNodeLabelColor={"white"}
          nodeSize={(n) => n.size ?? null}
          nodeColor="rgba(80, 105, 180, 0.75)"
          linkWidth={(l: Link) => l.width ?? null}
          linkColor={(l: Link) => l.color ?? null}
          curvedLinks
          onClick={onCosmographClick}
        />
        <div className="absolute bottom-[70px] w-[350px] flex flex-col m-1">
          {selectedNode ? (
            <div className="m-2 text-white text-sm whitespace-pre-line">
              {`id: ${selectedNode?.id}
            value: ${selectedNode?.value}`}
            </div>
          ) : (
            <></>
          )}
        </div>
      </CosmographProvider>
    </div>
  );
}
