"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLive } from "@/components/providers/LiveProvider";
import { DECISIONS } from "@/types/metrics";
import type { Decision } from "@/types/metrics";

const COLORS: Record<Decision, string> = {
  SAFE: "#3ec486",
  REVIEW: "#e8a33d",
  BLOCK: "#e5688a",
};

export function DecisionDonut() {
  const { decisionCounts, snapshotLoading, status } = useLive();

  const total = decisionCounts
    ? DECISIONS.reduce((sum, decision) => sum + decisionCounts[decision], 0)
    : 0;

  const data = decisionCounts
    ? DECISIONS.map((decision) => ({
        name: decision,
        value: decisionCounts[decision],
      })).filter((slice) => slice.value > 0)
    : [];

  const dominant =
    total > 0
      ? [...data].sort((a, b) => b.value - a.value)[0]
      : null;

  return (
    <Card aria-labelledby="mix-heading" className="flex flex-col gap-4">
      <CardHeader id="mix-heading" title="Decision mix" hint="Share of results in the window" />

      {total === 0 ? (
        status === "connecting" || snapshotLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : (
          <EmptyState message="No decisions recorded yet." />
        )
      ) : (
        <>
          <div className="relative h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="66%"
                  outerRadius="94%"
                  paddingAngle={2}
                  stroke="none"
                  animationDuration={450}
                >
                  {data.map((slice) => (
                    <Cell key={slice.name} fill={COLORS[slice.name as Decision]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {dominant && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="tnum text-2xl font-bold leading-none text-ink">
                  {((dominant.value / total) * 100).toFixed(0)}%
                </span>
                <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {dominant.name}
                </span>
              </div>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {DECISIONS.map((decision) => {
              const count = decisionCounts?.[decision] ?? 0;
              const share = total > 0 ? (count / total) * 100 : 0;

              return (
                <li key={decision} className="flex items-center gap-2 text-xs">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[decision] }}
                  />
                  <span className="font-medium text-ink">{decision}</span>
                  <span className="tnum ml-auto text-muted">{count.toLocaleString("en-US")}</span>
                  <span className="tnum w-12 text-right font-semibold text-ink">
                    {share.toFixed(1)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
