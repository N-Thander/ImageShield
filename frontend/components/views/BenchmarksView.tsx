"use client";

import { useCallback } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { ResourceCard } from "@/components/service/ResourceCard";
import { EmptyState } from "@/components/ui/States";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { fetchBenchmarks } from "@/lib/api";
import { EM_DASH, formatNumber, formatRelative } from "@/lib/format";
import { navItemFor } from "@/lib/nav";
import type { BenchmarkRun } from "@/types/metrics";

const HEAD =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted whitespace-nowrap";
const HEAD_RIGHT = `${HEAD} text-right`;

export function BenchmarksView() {
  const nav = navItemFor("/benchmarks");
  const resource = useAsyncResource<BenchmarkRun[]>(
    useCallback((signal: AbortSignal) => fetchBenchmarks(signal), []),
  );

  return (
    <PageShell>
      <PageHeader title="Benchmarks" blurb={nav?.blurb} />

      <ResourceCard
        title="Throughput by run"
        hint="Images per second, higher is better"
        resource={resource}
        skeletonRows={6}
      >
        {(runs) => {
          if (runs.length === 0) {
            return <EmptyState message="No benchmark runs have been recorded yet." />;
          }

          return (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={runs} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#dec2f5" strokeOpacity={0.45} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#6b6577", fontSize: 11 }}
                  />
                  <YAxis
                    width={48}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#6b6577", fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f3e9fb" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #dec2f5",
                      boxShadow: "0 16px 36px -20px rgb(38 10 61 / 0.22)",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="throughput_per_sec"
                    name="img/s"
                    fill="#8924db"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                    animationDuration={450}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        }}
      </ResourceCard>

      <ResourceCard title="Results" hint="From /benchmarks" resource={resource} skeletonRows={5}>
        {(runs) => {
          if (runs.length === 0) return null;

          return (
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <caption className="sr-only">Benchmark run results</caption>
                <thead>
                  <tr className="border-b border-hairline">
                    <th scope="col" className={HEAD}>
                      Run
                    </th>
                    <th scope="col" className={HEAD_RIGHT}>
                      Images
                    </th>
                    <th scope="col" className={HEAD_RIGHT}>
                      img/s
                    </th>
                    <th scope="col" className={HEAD_RIGHT}>
                      p50
                    </th>
                    <th scope="col" className={HEAD_RIGHT}>
                      p95
                    </th>
                    <th scope="col" className={HEAD_RIGHT}>
                      p99
                    </th>
                    <th scope="col" className={HEAD_RIGHT}>
                      Cache
                    </th>
                    <th scope="col" className={HEAD_RIGHT}>
                      When
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b border-hairline/50 last:border-0">
                      <td className="px-3 py-2.5 font-medium text-ink">{run.name}</td>
                      <td className="tnum px-3 py-2.5 text-right text-xs text-ink">
                        {formatNumber(run.images)}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-xs font-semibold text-ink">
                        {run.throughput_per_sec.toFixed(1)}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-xs text-muted">
                        {run.p50_ms.toFixed(0)} ms
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-xs text-muted">
                        {run.p95_ms.toFixed(0)} ms
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-xs text-muted">
                        {run.p99_ms.toFixed(0)} ms
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-xs text-muted">
                        {run.cache_hit_rate === undefined
                          ? EM_DASH
                          : `${(run.cache_hit_rate <= 1 ? run.cache_hit_rate * 100 : run.cache_hit_rate).toFixed(0)}%`}
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-xs text-muted">
                        {formatRelative(run.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }}
      </ResourceCard>
    </PageShell>
  );
}
