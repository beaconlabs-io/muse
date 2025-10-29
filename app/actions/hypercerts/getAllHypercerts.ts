import "server-only";

import request from "graphql-request";
import { graphqlEndpoint } from "@/configs/hypercerts";
import { VariablesOf, graphql, readFragment } from "@/lib/graphql";
import { HypercertListFragment } from "@/types/hypercerts/fragments/hypercert-list.fragment";

export type GetAllHypercertsParams = {
  first: number;
  offset: number;
  orderBy?: ClaimsOrderBy;
  chainId?: number;
  burned?: boolean;
};

export type ClaimsOrderBy =
  | "created_asc"
  | "created_desc"
  | "attestations_count_asc"
  | "attestations_count_desc";

export type ClaimsFilter = "all" | "evaluated";
const query = graphql(
  `
    query AllHypercerts(
      $where: HypercertWhereInput
      $sortBy: HypercertSortOptions
      $first: Int
      $offset: Int
    ) {
      hypercerts(where: $where, first: $first, offset: $offset, sortBy: $sortBy) {
        count

        data {
          ...HypercertListFragment
        }
      }
    }
  `,
  [HypercertListFragment],
);
type VariableTypes = VariablesOf<typeof query>;

function createFilter({
  chainId,
  burned,
}: {
  chainId?: number;
  burned?: boolean;
}): VariableTypes["where"] {
  const where: VariableTypes["where"] = {};
  where.metadata = { work_scope: { arrayOverlaps: ["Logic Model", "Logic Model Implementation"] } };

  if (chainId) {
    where.contract = {
      chain_id: {
        eq: chainId.toString(),
      },
    };
  }
  where.burned = {
    eq: burned,
  };

  return where;
}
function createOrderBy({ orderBy }: { orderBy?: ClaimsOrderBy }): VariableTypes["sortBy"] {
  if (orderBy) {
    const directionDivider = orderBy.lastIndexOf("_");
    const orderByAttribute = orderBy.substring(0, directionDivider);
    const orderByDirection = orderBy.substring(directionDivider + 1);
    if (orderByAttribute === "created") {
      return {
        creation_block_timestamp: orderByDirection === "asc" ? "ascending" : "descending",
      };
    }
    if (orderByAttribute === "attestations_count") {
      return {
        attestations_count: orderByDirection === "asc" ? "ascending" : "descending",
      };
    }
  }
  return {
    creation_block_timestamp: "descending",
  };
}

export async function getAllHypercerts({
  first,
  offset,
  orderBy,
  chainId,
  burned,
}: GetAllHypercertsParams) {
  const res = await request(graphqlEndpoint, query, {
    first,
    offset,
    sort: createOrderBy({ orderBy }),
    where: createFilter({ chainId, burned }),
  });

  if (!res.hypercerts?.data) {
    return {
      count: 0,
      data: [],
    };
  }

  const data = res.hypercerts.data.reduce<NonNullable<HypercertListFragment>[]>(
    (acc, hypercert) => {
      const hcData = readFragment(HypercertListFragment, hypercert);
      if (hcData?.hypercert_id) {
        acc.push(hcData);
      }
      return acc;
    },
    [],
  );

  return {
    count: res.hypercerts?.count ?? 0,
    data,
  };
}
