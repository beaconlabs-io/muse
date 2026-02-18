import { cache } from "react";
import { HypercertsList } from "./hypercerts-list";
import {
  getAllHypercerts,
  GetAllHypercertsParams,
} from "@/app/actions/hypercerts/getAllHypercerts";

const getHypercertsData = cache(async (params: GetAllHypercertsParams) => {
  return await getAllHypercerts(params);
});

export default function Page() {
  // TODO: implement pagenation
  const params: GetAllHypercertsParams = {
    first: 100,
    offset: 0,
  };

  return <HypercertsList hypercertsPromise={getHypercertsData(params)} />;
}
