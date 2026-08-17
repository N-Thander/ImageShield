"use client";

import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TrendDelta } from "@/components/ui/Pills";
import type { Polarity } from "@/components/ui/Pills";
import { useCountUp } from "@/hooks/useCountUp";
import { EM_DASH } from "@/lib/format";
import type { Metric } from "@/types/metrics";

type KpiTileProps = {
  label: string;
  metric: Metric;
  icon: LucideIcon;
  /** Renders the tweened value; receives null when the value is unknown. */
  format: (value: number | null) => string;
  unit?: string;
  polarity?: Polarity;
  loading?: boolean;
};

export function KpiTile({
  label,
  metric,
  icon: Icon,
  format,
  unit,
  polarity = "higher-is-better",
  loading = false,
}: KpiTileProps) {
  // Counts up on every change; a null target stays null so the tile shows an
  // em dash rather than animating toward a number nobody reported.
  const animated = useCountUp(metric.value);
  const unknown = metric.value === null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>

      {loading && unknown ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <p className="flex items-baseline gap-1.5">
          <span className="tnum text-3xl font-bold leading-none tracking-tight text-ink">
            {unknown ? EM_DASH : format(animated)}
          </span>
          {unit && !unknown && <span className="text-sm font-medium text-muted">{unit}</span>}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <TrendDelta deltaPct={metric.deltaPct} polarity={polarity} />
        <span className="text-[11px] text-muted">
          {metric.source === "live"
            ? "live window"
            : metric.source === "snapshot"
              ? "from /stats"
              : "no data yet"}
        </span>
      </div>
    </Card>
  );
}
