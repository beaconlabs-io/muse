"use client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";

export function HypercertsList() {
  const queryClient = useQueryClient();

  const hypercerts = queryClient.getQueryData(["allHypercerts"]) || [];

  console.log("hypercerts: ", hypercerts);

  return <div>hypercerts-list</div>;
}
