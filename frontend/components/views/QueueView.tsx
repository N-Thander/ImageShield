"use client";

import { useCallback } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { ResourceCard, Stat, StatGrid } from "@/components/service/ResourceCard";
import { EmptyState } from "@/components/ui/States";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { fetchServiceMetrics } from "@/lib/api";
import { EM_DASH, formatClock, formatMs, formatNumber } from "@/lib/format";
import { navItemFor } from "@/lib/nav";
import type { QueueMetrics } from "@/types/metrics";

const REFRESH_MS = 10_000;

export function QueueView() {
  const nav = navItemFor("/queue");
  const resource = useAsyncResource<QueueMetrics>(
    useCallback((signal: AbortSignal) => fetchServiceMetrics("queue", signal), []),
    { refreshMs: REFRESH_MS },
  );

  return (
    <PageShell>
      <PageHeader title="Kafka / Redpanda" blurb={nav?.blurb} />

      <ResourceCard title="Consumer" hint="From /services/queue" resource={resource}>
        {(data) => (
          <StatGrid>
            <Stat label="Consumer lag" value={formatNumber(data.consumer_lag)} sub="messages behind" />
            <Stat label="Queue depth" value={formatNumber(data.queue_depth)} sub="pending messages" />
            <Stat
              label="Throughput"
              value={
                data.messages_per_sec === undefined
                  ? EM_DASH
                  : `${data.messages_per_sec.toFixed(1)} /s`
              }
              sub="messages per second"
            />
            <Stat label="Topic" value={data.topic ?? EM_DASH} sub={
              data.partitions === undefined ? undefined : `${data.partitions} partitions`
            } />
            <Stat
              label="Latency"
              value={data.latency_ms === undefined ? EM_DASH : `${formatMs(data.latency_ms)} ms`}
              sub="broker probe"
            />
          </StatGrid>
        )}
      </ResourceCard>

      <ResourceCard title="Queue depth over time" resource={resource} skeletonRows={6}>
        {(data) => {
          const series = data.depth_series;
          if (!series || series.length === 0) {
            return (
              <EmptyState message="The queue endpoint has not reported a depth history yet." />
            );
          }

          const points = series.map((point) => ({
            label: formatClock(point.ts),
            depth: point.depth,
            lag: point.lag ?? 0,
          }));

          return (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill-depth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8924db" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8924db" stopOpacity={0.03} />
                    </linearGradient>
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
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #dec2f5",
                      boxShadow: "0 16px 36px -20px rgb(38 10 61 / 0.22)",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="depth"
                    stroke="#8924db"
                    strokeWidth={2}
                    fill="url(#fill-depth)"
                    animationDuration={400}
                  />
                  <Area
                    type="monotone"
                    dataKey="lag"
                    stroke="#c99aef"
                    strokeWidth={2}
                    fill="none"
                    animationDuration={400}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );
        }}
      </ResourceCard>
    </PageShell>
  );
}
