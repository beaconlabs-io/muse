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
  const params: GetAllHypercertsParams = {
    first: 12,
    offset: 12,
    burned: false,
  };

  return <HypercertsList hypercertsPromise={getHypercertsData(params)} />;
}
