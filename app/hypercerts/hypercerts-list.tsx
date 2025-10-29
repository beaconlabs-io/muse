import { Hypercert } from "./hypercerts";
import { HypercertListFragment } from "@/types/hypercerts/fragments/hypercert-list.fragment";

interface HypercertsListProps {
  hypercertsPromise: Promise<{
    count: number;
    data: HypercertListFragment[];
  }>;
}

export async function HypercertsList({ hypercertsPromise }: HypercertsListProps) {
  const { data: hypercerts, count } = await hypercertsPromise;

  if (!hypercerts || hypercerts.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground text-lg">No hypercerts found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Showing {hypercerts.length} of {count} hypercerts
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {hypercerts.map((hypercert) => (
          <Hypercert key={hypercert.hypercert_id} hypercert={hypercert} />
        ))}
      </div>
    </div>
  );
}
