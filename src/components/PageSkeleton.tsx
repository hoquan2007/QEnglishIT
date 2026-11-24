/** Instant placeholder shown by loading.tsx while a route streams in. */
export function PageSkeleton({ contained = false, grid = 6 }: { contained?: boolean; grid?: number }) {
  return (
    <div className={contained ? "mx-auto max-w-7xl px-4 py-8" : ""} aria-busy="true" aria-label="Đang tải">
      <div className="skeleton mb-6 h-40 rounded-3xl md:h-44" />
      <div className="mb-5 flex gap-2">
        <div className="skeleton h-8 w-24 rounded-full" />
        <div className="skeleton h-8 w-28 rounded-full" />
        <div className="skeleton h-8 w-20 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: grid }, (_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
    </div>
  );
}
