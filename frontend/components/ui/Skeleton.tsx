import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-shimmer rounded-lg bg-primary-50", className)}
    />
  );
}

/** Placeholder for a chart/plot area while the first data is still loading. */
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-end gap-2", className)} aria-hidden="true">
      {[38, 62, 45, 78, 55, 88, 48, 70, 60, 82].map((height, index) => (
        <span
          key={index}
          className="flex-1 animate-shimmer rounded-t-md bg-primary-50"
          style={{ height: `${height}%`, animationDelay: `${index * 70}ms` }}
        />
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}
