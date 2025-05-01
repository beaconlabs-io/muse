import { BoxPlot } from "@/components/charts/box-plot";
import { MultipleLine } from "@/components/charts/multiple-line";
import { Scatter } from "@/components/charts/scatter";
import { getTxcounts } from "@/hooks/getGrowThePie";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { Suspense } from "react";

export default async function Page() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["getTxcounts"],
    queryFn: getTxcounts,
  });

  const dehydratedState = dehydrate(queryClient);
  return (
    <main>
      <HydrationBoundary state={dehydratedState}>
        <div className="container flex flex-col mx-auto items-center gap-4 p-8">
          <Suspense fallback={<div>Loading...</div>}>
            <MultipleLine />
            <Scatter />
            <BoxPlot />
          </Suspense>
        </div>
      </HydrationBoundary>
    </main>
  );
}
