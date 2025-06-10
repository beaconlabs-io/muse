import { DataTable } from "@/components/table/data-table";
import { columns } from "@/components/table/table-column";
import { getAllEvidence } from "@/hooks/useEAS";
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

  return (
    <main>
      <HydrationBoundary state={dehydratedState}>
        <div className="container mx-auto p-4">
          <DataTable columns={columns} />
        </div>
      </HydrationBoundary>
    </main>
  );
}
