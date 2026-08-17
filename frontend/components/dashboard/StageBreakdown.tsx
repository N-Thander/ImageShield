"use client";

import { useMemo } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { TrendDelta } from "@/components/ui/Pills";
import { TIME_RANGES, useLive } from "@/components/providers/LiveProvider";
import { STAGES, STAGE_LABELS } from "@/types/metrics";
import type { Stage } from "@/types/metrics";

/**
 * Ranked cascade usage. A request resolved by an earlier (cheaper) stage is a
 * win, so the list is a quick read on how well the cascade is deflecting work
 * away from the heavy model.
 */
export function StageBreakdown() {
  const { stageCounts, events, range, now, status, snapshotLoading } = useLive();

  // Half-window comparison, computed here rather than in the provider since
  // this is the only card that needs per-stage trends. `now` comes from the
  // provider's ticking clock so this stays a pure derivation.
  const deltas = useMemo(() => {
    const { windowMs } = TIME_RANGES[range];
    const half = windowMs / 2;

    const recent = events.filter((e) => e.receivedAt >= now - half);
    const previous = events.filter(
      (e) => e.receivedAt >= now - windowMs && e.receivedAt < now - half,
    );

    if (recent.length < 5 || previous.length < 5) return null;

    return Object.fromEntries(
      STAGES.map((stage) => {
        const before = previous.filter((e) => e.stage === stage).length;
        const after = recent.filter((e) => e.stage === stage).length;
        return [stage, before === 0 ? null : ((after - before) / before) * 100];
      }),
    ) as Record<Stage, number | null>;
  }, [events, range, now]);

  const total = stageCounts ? STAGES.reduce((sum, stage) => sum + stageCounts[stage], 0) : 0;

  const ranked = stageCounts
    ? [...STAGES].sort((a, b) => stageCounts[b] - stageCounts[a])
    : [];

  return (
    <Card aria-labelledby="stages-heading" className="flex flex-col gap-4">
      <CardHeader
        id="stages-heading"
        title="Cascade stages"
        hint="Which stage resolved each image"
      />

      {total === 0 ? (
        status === "connecting" || snapshotLoading ? (
          <SkeletonRows rows={4} />
        ) : (
          <EmptyState message="No stage attribution yet — this fills in as the cascade resolves images." />
        )
      ) : (
        <ul className="flex flex-col gap-3.5">
          {ranked.map((stage) => {
            const count = stageCounts?.[stage] ?? 0;
            const share = total > 0 ? (count / total) * 100 : 0;

            return (
              <li key={stage} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-ink">{STAGE_LABELS[stage]}</span>
                  <span className="tnum ml-auto font-semibold text-ink">
                    {count.toLocaleString("en-US")}
                  </span>
                  <TrendDelta
                    deltaPct={deltas?.[stage] ?? null}
                    polarity="neutral"
                    className="w-14 justify-end"
                  />
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-primary-50"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-primary-400 transition-[width] duration-500"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
