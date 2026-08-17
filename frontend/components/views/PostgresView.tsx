"use client";

import { useCallback } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { ResourceCard, Stat, StatGrid } from "@/components/service/ResourceCard";
import { DecisionPill } from "@/components/ui/Pills";
import { EmptyState } from "@/components/ui/States";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { fetchServiceMetrics } from "@/lib/api";
import { formatBytes, formatMs, formatNumber, formatRelative, shortId } from "@/lib/format";
import { navItemFor } from "@/lib/nav";
import type { PostgresMetrics } from "@/types/metrics";

const REFRESH_MS = 15_000;
const ROW_LABELS = ["SAFE", "REVIEW", "BLOCK", "PENDING"] as const;

export function PostgresView() {
  const nav = navItemFor("/postgres");
  const resource = useAsyncResource<PostgresMetrics>(
    useCallback((signal: AbortSignal) => fetchServiceMetrics("postgres", signal), []),
    { refreshMs: REFRESH_MS },
  );

  return (
    <PageShell>
      <PageHeader title="Postgres" blurb={nav?.blurb} />

      <ResourceCard title="Table overview" hint="From /services/postgres" resource={resource}>
        {(data) => (
          <StatGrid>
            <Stat label="Total rows" value={formatNumber(data.total_rows)} sub="images table" />
            <Stat label="Table size" value={formatBytes(data.table_size_bytes)} sub="on disk" />
            <Stat
              label="Inserts / min"
              value={formatNumber(data.inserts_last_minute)}
              sub="last 60 seconds"
            />
            <Stat
              label="Query latency"
              value={data.latency_ms === undefined ? "—" : `${formatMs(data.latency_ms)} ms`}
              sub="health probe round-trip"
            />
          </StatGrid>
        )}
      </ResourceCard>

      <ResourceCard title="Rows by decision" resource={resource} skeletonRows={4}>
        {(data) => {
          const counts = data.row_counts;
          const total = counts
            ? ROW_LABELS.reduce((sum, key) => sum + (counts[key] ?? 0), 0)
            : 0;

          if (!counts || total === 0) {
            return <EmptyState message="No row counts reported for the images table yet." />;
          }

          return (
            <ul className="flex flex-col gap-4">
              {ROW_LABELS.map((label) => {
                const count = counts[label] ?? 0;
                const share = (count / total) * 100;

                return (
                  <li key={label} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <DecisionPill decision={label} />
                      <span className="tnum ml-auto text-sm font-semibold text-ink">
                        {formatNumber(count)}
                      </span>
                      <span className="tnum w-14 text-right text-xs text-muted">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-primary-50">
                      <div
                        className="h-full rounded-full bg-primary-400 transition-[width] duration-500"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        }}
      </ResourceCard>

      <ResourceCard title="Recent inserts" resource={resource} skeletonRows={5}>
        {(data) => {
          const rows = data.recent_inserts;
          if (!rows || rows.length === 0) {
            return <EmptyState message="No recent inserts have been reported." />;
          }

          return (
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <caption className="sr-only">Most recently inserted image rows</caption>
                <thead>
                  <tr className="border-b border-hairline">
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted"
                    >
                      Image
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted"
                    >
                      Decision
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted"
                    >
                      Inserted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.image_id}-${row.created_at}`}
                      className="border-b border-hairline/50 last:border-0"
                    >
                      <td className="px-3 py-2.5">
                        <code className="font-mono text-xs text-ink">{shortId(row.image_id)}</code>
                      </td>
                      <td className="px-3 py-2.5">
                        <DecisionPill decision={row.decision} />
                      </td>
                      <td className="tnum px-3 py-2.5 text-right text-xs text-muted">
                        {formatRelative(row.created_at)}
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
