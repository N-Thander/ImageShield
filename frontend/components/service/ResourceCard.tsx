"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { EM_DASH } from "@/lib/format";
import type { AsyncResource } from "@/types/metrics";

type ResourceCardProps<T> = {
  title: string;
  hint?: string;
  resource: AsyncResource<T> & { reload?: () => void };
  /** Return null to signal "loaded, but nothing to show". */
  children: (data: T) => React.ReactNode;
  emptyMessage?: string;
  skeletonRows?: number;
  className?: string;
  action?: React.ReactNode;
};

/**
 * Wraps a card body in the four states every read can be in: loading, failed,
 * loaded-but-empty, and loaded. Endpoints the backend has not shipped yet land
 * in the failed branch with a plain explanation rather than fabricated numbers.
 */
export function ResourceCard<T>({
  title,
  hint,
  resource,
  children,
  emptyMessage = "This endpoint responded, but reported no values yet.",
  skeletonRows = 4,
  className,
  action,
}: ResourceCardProps<T>) {
  const body = () => {
    if (resource.loading && resource.data === null) return <SkeletonRows rows={skeletonRows} />;
    if (resource.error) return <ErrorState message={resource.error} onRetry={resource.reload} />;
    if (resource.data === null) return <EmptyState message={emptyMessage} />;

    const rendered = children(resource.data);
    return rendered ?? <EmptyState message={emptyMessage} />;
  };

  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <CardHeader title={title} hint={hint} action={action} />
      {body()}
    </Card>
  );
}

/** A single labelled figure. `value` is pre-formatted and already em-dashed. */
export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="tnum text-xl font-bold leading-none text-ink">{value || EM_DASH}</span>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
