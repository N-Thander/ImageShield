"use client";

import { useCallback } from "react";
import { ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { ResourceCard, Stat, StatGrid } from "@/components/service/ResourceCard";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { fetchServiceMetrics } from "@/lib/api";
import { EM_DASH, formatBytes, formatMs, formatNumber } from "@/lib/format";
import { navItemFor } from "@/lib/nav";
import type { StorageMetrics } from "@/types/metrics";

const REFRESH_MS = 20_000;

export function StorageView() {
  const nav = navItemFor("/storage");
  const resource = useAsyncResource<StorageMetrics>(
    useCallback((signal: AbortSignal) => fetchServiceMetrics("storage", signal), []),
    { refreshMs: REFRESH_MS },
  );

  const consoleUrl = resource.data?.console_url ?? null;

  return (
    <PageShell>
      <PageHeader
        title="MinIO"
        blurb={nav?.blurb}
        action={
          consoleUrl && (
            <a
              href={consoleUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-card transition-colors hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            >
              Open bucket browser
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )
        }
      />

      <ResourceCard title="Object storage" hint="From /services/storage" resource={resource}>
        {(data) => (
          <div className="flex flex-col gap-6">
            <StatGrid>
              <Stat label="Objects" value={formatNumber(data.object_count)} sub="stored in bucket" />
              <Stat label="Bytes stored" value={formatBytes(data.bytes_stored)} />
              <Stat label="Bucket" value={data.bucket ?? EM_DASH} />
              <Stat
                label="Latency"
                value={data.latency_ms === undefined ? EM_DASH : `${formatMs(data.latency_ms)} ms`}
                sub="health probe"
              />
            </StatGrid>

            {!consoleUrl && (
              <p className="rounded-xl border border-dashed border-hairline bg-primary-50/40 px-4 py-3 text-xs leading-relaxed text-muted">
                The storage endpoint did not report a <code className="font-mono">console_url</code>,
                so the bucket-browser link is hidden. MinIO&apos;s console normally runs on port 9001.
              </p>
            )}
          </div>
        )}
      </ResourceCard>
    </PageShell>
  );
}
