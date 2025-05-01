import { BoxPlot } from "@/components/charts/box-plot";
import { Histogram } from "@/components/charts/histogram";
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

  const histogramData = Array.from({ length: 100 }).map(() => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const value = 5 + 1.5 * z;
    return { x: value };
  });
  return (
    <main>
      <HydrationBoundary state={dehydratedState}>
        <div className="container flex flex-col mx-auto items-center gap-4 p-8">
          <Suspense fallback={<div>Loading...</div>}>
            <MultipleLine />
            <Scatter />
            <BoxPlot />
            <Histogram data={histogramData} />
          </Suspense>
        </div>
      </HydrationBoundary>
    </main>
  );
}
