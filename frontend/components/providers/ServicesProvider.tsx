"use client";

import { createContext, useCallback, useContext } from "react";

import { fetchServiceMetrics } from "@/lib/api";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import type {
  QueueMetrics,
  RedisMetrics,
  ServiceKey,
  ServiceStatus,
  StorageMetrics,
} from "@/types/metrics";

const REFRESH_MS = 20_000;

export type ServiceSummary = {
  key: ServiceKey;
  label: string;
  href: string;
  status: ServiceStatus;
  /** One-line metric for the health list, or null when unknown. */
  detail: string | null;
  error: string | null;
};

const SERVICES: { key: ServiceKey; label: string; href: string }[] = [
  { key: "postgres", label: "Postgres", href: "/postgres" },
  { key: "redis", label: "Redis", href: "/redis" },
  { key: "queue", label: "Kafka / Redpanda", href: "/queue" },
  { key: "storage", label: "MinIO", href: "/storage" },
];

function detailFor(key: ServiceKey, payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;

  if (key === "redis") {
    const rate = (payload as RedisMetrics).cache_hit_rate;
    if (rate === undefined) return null;
    return `${(rate <= 1 ? rate * 100 : rate).toFixed(1)}% hit rate`;
  }

  if (key === "queue") {
    const lag = (payload as QueueMetrics).consumer_lag;
    return lag === undefined ? null : `${lag.toLocaleString("en-US")} lag`;
  }

  if (key === "storage") {
    const objects = (payload as StorageMetrics).object_count;
    return objects === undefined ? null : `${objects.toLocaleString("en-US")} objects`;
  }

  const latency = (payload as { latency_ms?: number }).latency_ms;
  return latency === undefined ? null : `${latency.toFixed(1)} ms`;
}

type ServicesContextValue = {
  services: ServiceSummary[];
  loading: boolean;
  upCount: number;
  totalCount: number;
  /** Aggregate for the sidebar dot. */
  overall: ServiceStatus;
  reload: () => void;
};

const ServicesContext = createContext<ServicesContextValue | null>(null);

async function loadAll(signal: AbortSignal): Promise<ServiceSummary[]> {
  const results = await Promise.allSettled(
    SERVICES.map((service) => fetchServiceMetrics(service.key, signal)),
  );

  return SERVICES.map((service, index) => {
    const result = results[index];

    if (result.status === "rejected") {
      // A missing endpoint is not the same as a dead service — say "unknown".
      const message = result.reason instanceof Error ? result.reason.message : "unavailable";
      return { ...service, status: "unknown" as const, detail: null, error: message };
    }

    const payload = result.value as { status?: ServiceStatus };
    return {
      ...service,
      status: payload.status ?? "up",
      detail: detailFor(service.key, payload),
      error: null,
    };
  });
}

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const { data, loading, reload } = useAsyncResource<ServiceSummary[]>(
    useCallback((signal: AbortSignal) => loadAll(signal), []),
    { refreshMs: REFRESH_MS },
  );

  const services = data ?? [];
  const upCount = services.filter((service) => service.status === "up").length;
  const totalCount = SERVICES.length;

  const overall: ServiceStatus = services.some((service) => service.status === "down")
    ? "down"
    : upCount === totalCount && totalCount > 0
      ? "up"
      : upCount > 0
        ? "degraded"
        : "unknown";

  return (
    <ServicesContext.Provider
      value={{ services, loading, upCount, totalCount, overall, reload }}
    >
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): ServicesContextValue {
  const context = useContext(ServicesContext);
  if (!context) throw new Error("useServices must be used inside <ServicesProvider>");
  return context;
}
