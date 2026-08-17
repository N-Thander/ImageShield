"use client";

import { useCallback } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { ResourceCard, Stat, StatGrid } from "@/components/service/ResourceCard";
import { EmptyState } from "@/components/ui/States";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { fetchServiceMetrics } from "@/lib/api";
import { EM_DASH, formatBytes, formatMs, formatNumber, toPercentValue } from "@/lib/format";
import { navItemFor } from "@/lib/nav";
import type { RedisMetrics } from "@/types/metrics";

const REFRESH_MS = 10_000;

export function RedisView() {
  const nav = navItemFor("/redis");
  const resource = useAsyncResource<RedisMetrics>(
    useCallback((signal: AbortSignal) => fetchServiceMetrics("redis", signal), []),
    { refreshMs: REFRESH_MS },
  );

  return (
    <PageShell>
      <PageHeader title="Redis" blurb={nav?.blurb} />

      <ResourceCard title="Cache" hint="From /services/redis" resource={resource}>
        {(data) => {
          const hitRate = toPercentValue(data.cache_hit_rate);

          return (
            <div className="flex flex-col gap-6">
              {hitRate === null ? (
                <EmptyState message="Cache hit rate has not been reported yet." />
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="tnum text-4xl font-bold leading-none text-ink">
                      {hitRate.toFixed(1)}
                    </span>
                    <span className="text-sm font-medium text-muted">% hit rate</span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full bg-primary-50"
                    role="img"
                    aria-label={`Cache hit rate ${hitRate.toFixed(1)} percent`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-[width] duration-700"
                      style={{ width: `${Math.min(hitRate, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted">
                    {formatNumber(data.hits)} hits · {formatNumber(data.misses)} misses
                  </p>
                </div>
              )}

              <StatGrid>
                <Stat label="Keyspace" value={formatNumber(data.keyspace_size)} sub="keys stored" />
                <Stat
                  label="Memory used"
                  value={formatBytes(data.memory_used_bytes)}
                  sub={
                    data.memory_peak_bytes === undefined
                      ? undefined
                      : `peak ${formatBytes(data.memory_peak_bytes)}`
                  }
                />
                <Stat label="Evicted keys" value={formatNumber(data.evicted_keys)} />
                <Stat
                  label="Latency"
                  value={data.latency_ms === undefined ? EM_DASH : `${formatMs(data.latency_ms)} ms`}
                  sub="PING round-trip"
                />
              </StatGrid>
            </div>
          );
        }}
      </ResourceCard>
    </PageShell>
  );
}
