import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-16">
      {/* Title + metadata, mirroring EvidenceHeader */}
      <div className="space-y-5 border-b pb-8">
        <Skeleton className="h-10 w-4/5" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Article body */}
      <div className="space-y-8 py-10">
        {[...Array(3)].map((_, section) => (
          <div key={section} className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
