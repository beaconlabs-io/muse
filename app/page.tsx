import { DataTable } from "@/components/table/data-table";
import { columns } from "@/components/table/table-column";
import { getAllEvidence } from "@/hooks/useEAS";
import { getAllPostsMeta } from "@/utils";
import { Hero } from "@/components/hero";

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

export default async function Home() {
  const queryClient = new QueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: ["getAllEvidence"],
      queryFn: getAllEvidence,
    });
  } catch (error) {
    console.error("Error prefetching data:", error);
  }

  const dehydratedState = dehydrate(queryClient);

  const evidence = await getAllPostsMeta();

  return (
    <main>
      <Hero />
      <HydrationBoundary state={dehydratedState}>
        <div className="container mx-auto p-4">
          <DataTable data={evidence} columns={columns} />
        </div>
      </HydrationBoundary>
    </main>
  );
}
