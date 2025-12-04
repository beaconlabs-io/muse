export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-6 py-8">
      {/* Title skeleton */}
      <div className="mb-4 h-10 w-4/5 rounded-lg bg-gray-200" />

      {/* Metadata skeleton (date, author, version) */}
      <div className="mb-8 flex items-center gap-2">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="h-4 w-4 rounded bg-gray-200" />
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="h-4 w-4 rounded bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-200" />
      </div>

      {/* Table of Contents skeleton */}
      <div className="mb-10 space-y-3">
        {/* Main items */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-gray-200" />
          <div className="h-4 w-28 rounded bg-gray-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-gray-200" />
          <div className="h-4 w-36 rounded bg-gray-200" />
        </div>

        {/* Nested items */}
        <div className="ml-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-200" />
            <div className="h-4 w-20 rounded bg-gray-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-200" />
            <div className="h-4 w-64 rounded bg-gray-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-200" />
            <div className="h-4 w-72 rounded bg-gray-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-200" />
            <div className="h-4 w-56 rounded bg-gray-200" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      </div>

      {/* Key Points section skeleton */}
      <div className="mb-8">
        <div className="mb-4 h-7 w-28 rounded bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>
      </div>

      {/* Background section skeleton */}
      <div className="mb-8">
        <div className="mb-4 h-7 w-32 rounded bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
