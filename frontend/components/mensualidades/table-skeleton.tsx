import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <div className="p-4">
      {/* Header row */}
      <div className="flex items-center gap-4 px-1 pb-3 mb-1 border-b border-border-soft">
        {[120, 80, 60, 80, 90, 70, 80, 60].map((w, i) => (
          <Skeleton key={i} className="h-3 rounded bg-page-input" style={{ width: w }} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 py-4"
          style={{ borderBottom: rowIndex < 5 ? "1px solid var(--border-row)" : "none" }}
        >
          {/* Client cell */}
          <div className="flex items-center gap-3" style={{ minWidth: 120 }}>
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 bg-page-input" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded bg-page-input" />
              <Skeleton className="h-2 w-16 rounded bg-page-subtle" />
            </div>
          </div>
          {/* Plate */}
          <Skeleton className="h-6 w-16 rounded-lg bg-primary-dim" />
          {/* Type */}
          <Skeleton className="h-3 w-12 rounded bg-page-input" />
          {/* Start */}
          <Skeleton className="h-3 w-20 rounded bg-page-input" />
          {/* End */}
          <Skeleton className="h-3 w-20 rounded bg-page-input" />
          {/* Status */}
          <Skeleton className="h-6 w-18 rounded-full bg-page-input" />
          {/* Price */}
          <Skeleton className="h-3 w-24 rounded bg-page-input" />
          {/* Action */}
          <Skeleton className="h-7 w-20 rounded-lg bg-primary-dim" />
        </div>
      ))}
    </div>
  );
}
