"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { SkeletonChart } from "@/components/ui/Skeleton";
import { useLive } from "@/components/providers/LiveProvider";
import { DECISIONS } from "@/types/metrics";
import type { Decision } from "@/types/metrics";

/** Series colours match the decision pills so the two read as one language. */
const SERIES: Record<Decision, { stroke: string; fill: string }> = {
  SAFE: { stroke: "#3ec486", fill: "#3ec486" },
  REVIEW: { stroke: "#e8a33d", fill: "#e8a33d" },
  BLOCK: { stroke: "#e5688a", fill: "#e5688a" },
};

type TooltipItem = { dataKey?: string | number; value?: number; color?: string };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum, item) => sum + (item.value ?? 0), 0);

  return (
    <div className="rounded-xl border border-hairline bg-card px-3 py-2 shadow-lift">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {payload.map((item) => (
          <li key={String(item.dataKey)} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted">{String(item.dataKey)}</span>
            <span className="tnum ml-auto font-semibold text-ink">{item.value ?? 0}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 border-t border-hairline pt-1.5 text-xs text-muted">
        Total <span className="tnum font-semibold text-ink">{total}</span>
      </p>
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex items-center gap-3">
      {DECISIONS.map((decision) => (
        <li key={decision} className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
          <span
            aria-hidden="true"
            className="size-2 rounded-full"
            style={{ backgroundColor: SERIES[decision].stroke }}
          />
          {decision}
        </li>
      ))}
    </ul>
  );
}

export function ThroughputChart() {
  const { series, hasSeriesData, bucketSeconds, snapshotLoading, status, range } = useLive();

  return (
    <Card aria-labelledby="throughput-heading" className="flex flex-col gap-4">
      <CardHeader
        id="throughput-heading"
        title="Throughput over time"
        hint={`Images moderated per ${bucketSeconds}s bucket, split by decision · last ${range}`}
        action={<Legend />}
      />

      <div className="h-[300px] w-full">
        {!hasSeriesData ? (
          status === "connecting" || snapshotLoading ? (
            <SkeletonChart className="h-full w-full" />
          ) : (
            <EmptyState
              className="h-full"
              message="No moderation events have arrived on the live feed yet. The chart fills in as soon as the pipeline processes an image."
            />
          )
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                {DECISIONS.map((decision) => (
                  <linearGradient
                    key={decision}
                    id={`fill-${decision}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={SERIES[decision].fill} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={SERIES[decision].fill} stopOpacity={0.04} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid stroke="#dec2f5" strokeOpacity={0.45} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={40}
                tick={{ fill: "#6b6577", fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                width={48}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b6577", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke: "#c99aef", strokeWidth: 1 }}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload as unknown as TooltipItem[] | undefined}
                    label={props.label as string | undefined}
                  />
                )}
              />

              {DECISIONS.map((decision) => (
                <Area
                  key={decision}
                  type="monotone"
                  dataKey={decision}
                  stackId="decisions"
                  stroke={SERIES[decision].stroke}
                  strokeWidth={2}
                  fill={`url(#fill-${decision})`}
                  animationDuration={400}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
