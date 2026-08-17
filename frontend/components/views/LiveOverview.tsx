"use client";

import { Gauge, Layers, Timer, Zap } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { ReconnectBanner } from "@/components/live/ConnectionStatus";
import { DecisionDonut } from "@/components/dashboard/DecisionDonut";
import { EventsTable } from "@/components/dashboard/EventsTable";
import { KpiTile } from "@/components/dashboard/KpiTile";
import { ServiceHealthList } from "@/components/dashboard/ServiceHealthList";
import { StageBreakdown } from "@/components/dashboard/StageBreakdown";
import { ThroughputChart } from "@/components/dashboard/ThroughputChart";
import { useLive } from "@/components/providers/LiveProvider";
import { EM_DASH, formatCompact, formatMs, formatNumber } from "@/lib/format";
import { navItems } from "@/lib/nav";

const overview = navItems[0];

export function LiveOverview() {
  const { throughput, latencyP95, cacheHitRate, queueDepth, snapshotLoading } = useLive();

  return (
    <PageShell>
      <PageHeader title={overview.label} blurb={overview.blurb} showRange />

      <ReconnectBanner />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="Key metrics" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label="Throughput"
              unit="img/s"
              metric={throughput}
              icon={Gauge}
              format={formatCompact}
              polarity="higher-is-better"
              loading={snapshotLoading}
            />
            <KpiTile
              label="p95 latency"
              unit="ms"
              metric={latencyP95}
              icon={Timer}
              format={formatMs}
              polarity="lower-is-better"
              loading={snapshotLoading}
            />
            <KpiTile
              label="Cache hit rate"
              unit="%"
              metric={cacheHitRate}
              icon={Zap}
              format={(value) => (value === null ? EM_DASH : value.toFixed(1))}
              polarity="higher-is-better"
              loading={snapshotLoading}
            />
            <KpiTile
              label="Queue depth"
              metric={queueDepth}
              icon={Layers}
              format={(value) => formatNumber(value)}
              polarity="lower-is-better"
              loading={snapshotLoading}
            />
          </section>

          <ThroughputChart />
          <EventsTable />
        </div>

        <aside aria-label="Breakdown and health" className="flex min-w-0 flex-col gap-6">
          <DecisionDonut />
          <StageBreakdown />
          <ServiceHealthList />
        </aside>
      </div>
    </PageShell>
  );
}
