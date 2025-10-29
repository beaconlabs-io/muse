import { Skeleton } from "@/components/ui/skeleton";

function HypercertSkeleton() {
  return (
    <div className="border-border bg-muted relative overflow-hidden rounded-2xl border shadow-sm">
      {/* Image Container */}
      <div className="from-muted to-muted/50 relative h-[320px] w-full overflow-hidden bg-gradient-to-br p-4">
        {/* Chain Badge Skeleton */}
        <Skeleton className="absolute top-4 right-4 z-10 h-6 w-24" />

        {/* Image Skeleton */}
        <div className="relative h-full w-full">
          <Skeleton className="h-full w-full" />
        </div>
      </div>

      {/* Content Section */}
      <section
        className="border-t-border bg-background/95 absolute bottom-0 flex w-full flex-col gap-2 border-t p-4 backdrop-blur-md"
        style={{
          boxShadow: "0 -10px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Title Skeleton */}
        <Skeleton className="h-6 w-3/4" />

        {/* Description Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </section>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <HypercertSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
