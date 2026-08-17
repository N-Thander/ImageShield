"use client";

import { useCallback } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { ResourceCard, Stat, StatGrid } from "@/components/service/ResourceCard";
import { DecisionPill } from "@/components/ui/Pills";
import { EmptyState } from "@/components/ui/States";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { fetchIngestion } from "@/lib/api";
import { EM_DASH, formatNumber, formatRelative } from "@/lib/format";
import { navItemFor } from "@/lib/nav";
import { DECISIONS } from "@/types/metrics";
import type { IngestionStats } from "@/types/metrics";

const REFRESH_MS = 15_000;

export function IngestionView() {
  const nav = navItemFor("/ingestion");
  const resource = useAsyncResource<IngestionStats>(
    useCallback((signal: AbortSignal) => fetchIngestion(signal), []),
    { refreshMs: REFRESH_MS },
  );

  return (
    <PageShell>
      <PageHeader title="Ingestion" blurb={nav?.blurb} />

      <ResourceCard
        title="Batch loader"
        hint={`Polled from /ingestion every ${REFRESH_MS / 1000}s`}
        resource={resource}
        skeletonRows={3}
      >
        {(data) => (
          <div className="flex flex-col gap-6">
            <StatGrid>
              <Stat label="Inbox" value={formatNumber(data.inbox_count)} sub="waiting to be picked up" />
              <Stat label="Processed" value={formatNumber(data.processed_count)} sub="completed" />
              <Stat label="Failed" value={formatNumber(data.failed_count)} sub="errored batches" />
              <Stat label="In flight" value={formatNumber(data.in_flight)} sub="currently moderating" />
              <Stat
                label="Batch rate"
                value={
                  data.batch_rate_per_sec === undefined
                    ? EM_DASH
                    : `${data.batch_rate_per_sec.toFixed(1)} /s`
                }
                sub="images per second"
              />
              <Stat label="Last batch" value={formatRelative(data.last_batch_at)} />
            </StatGrid>

            <InboxProgress inbox={data.inbox_count} processed={data.processed_count} />
          </div>
        )}
      </ResourceCard>

      <ResourceCard
        title="Decision split"
        hint="Across everything ingested so far"
        resource={resource}
        skeletonRows={3}
      >
        {(data) => {
          const counts = data.decision_counts;
          const total = counts
            ? DECISIONS.reduce((sum, decision) => sum + (counts[decision] ?? 0), 0)
            : 0;

          if (!counts || total === 0) {
            return (
              <EmptyState message="The ingestion endpoint has not reported a decision split yet." />
            );
          }

          return (
            <ul className="flex flex-col gap-4">
              {DECISIONS.map((decision) => {
                const count = counts[decision] ?? 0;
                const share = (count / total) * 100;

                return (
                  <li key={decision} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <DecisionPill decision={decision} />
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
    </PageShell>
  );
}

function InboxProgress({ inbox, processed }: { inbox?: number; processed?: number }) {
  if (inbox === undefined || processed === undefined) return null;

  const total = inbox + processed;
  const done = total === 0 ? 0 : (processed / total) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink">Inbox drain</span>
        <span className="tnum text-muted">
          {formatNumber(processed)} of {formatNumber(total)} processed
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-[width] duration-700"
          style={{ width: `${done}%` }}
        />
      </div>
    </div>
  );
}
