import { ResultOf, graphql } from "@/lib/graphql";

export const HypercertMetadataFragment = graphql(`
  fragment HypercertMetadataFragment on Metadata {
    contributors
    description
    id
    image
    name
    work_scope
    work_timeframe_from
    work_timeframe_to
  }
`);

export type HypercertMetadata = ResultOf<typeof HypercertMetadataFragment>;
