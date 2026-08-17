"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { fetchStats } from "@/lib/api";
import { LiveSocket } from "@/lib/liveSocket";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { DECISIONS, STAGES } from "@/types/metrics";
import type {
  ConnectionStatus,
  Decision,
  LiveEvent,
  Metric,
  ModerationEvent,
  Stage,
  StatsSnapshot,
  ThroughputPoint,
} from "@/types/metrics";

/* -------------------------------------------------------------------------- */
/* Ranges                                                                      */
/* -------------------------------------------------------------------------- */

export type TimeRange = "1m" | "5m" | "15m";

export const TIME_RANGES: Record<TimeRange, { label: string; windowMs: number; bucketMs: number }> =
  {
    "1m": { label: "1m", windowMs: 60_000, bucketMs: 5_000 },
    "5m": { label: "5m", windowMs: 300_000, bucketMs: 15_000 },
    "15m": { label: "15m", windowMs: 900_000, bucketMs: 60_000 },
  };

/** Longest window we can serve, so the buffer is trimmed to match. */
const MAX_BUFFER_MS = TIME_RANGES["15m"].windowMs;
const MAX_BUFFER_EVENTS = 3000;
const FLUSH_INTERVAL_MS = 500;
const SNAPSHOT_REFRESH_MS = 15_000;
/** Below this many samples a half-window comparison is noise, not a trend. */
const MIN_SAMPLES_FOR_DELTA = 5;

/* -------------------------------------------------------------------------- */
/* Pure derivations                                                            */
/* -------------------------------------------------------------------------- */

function percentile(values: number[], p: number): number | null {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const index = Math.min(clean.length - 1, Math.max(0, Math.ceil(p * clean.length) - 1));
  return clean[index];
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function countBy<K extends string>(events: LiveEvent[], key: (e: LiveEvent) => K, keys: readonly K[]) {
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const event of events) counts[key(event)] += 1;
  return counts;
}

function buildSeries(
  events: LiveEvent[],
  now: number,
  windowMs: number,
  bucketMs: number,
): ThroughputPoint[] {
  const bucketCount = Math.round(windowMs / bucketMs);
  const latestBucket = Math.floor(now / bucketMs) * bucketMs;

  const buckets = new Map<number, ThroughputPoint>();
  for (let i = bucketCount - 1; i >= 0; i -= 1) {
    const t = latestBucket - i * bucketMs;
    buckets.set(t, {
      t,
      label: new Date(t).toLocaleTimeString("en-GB", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      SAFE: 0,
      REVIEW: 0,
      BLOCK: 0,
      total: 0,
    });
  }

  for (const event of events) {
    const bucket = buckets.get(Math.floor(event.receivedAt / bucketMs) * bucketMs);
    if (!bucket) continue;
    bucket[event.decision] += 1;
    bucket.total += 1;
  }

  return [...buckets.values()];
}

/** Builds a Metric from live samples, falling back to the snapshot value. */
function metricFrom(
  recent: LiveEvent[],
  previous: LiveEvent[],
  compute: (events: LiveEvent[]) => number | null,
  fallback: number | null | undefined,
): Metric {
  const live = recent.length > 0 ? compute(recent) : null;

  if (live === null) {
    return {
      value: fallback ?? null,
      deltaPct: null,
      source: fallback === null || fallback === undefined ? "none" : "snapshot",
    };
  }

  const comparable =
    recent.length >= MIN_SAMPLES_FOR_DELTA && previous.length >= MIN_SAMPLES_FOR_DELTA;
  const before = comparable ? compute(previous) : null;

  return {
    value: live,
    deltaPct: before === null ? null : pctChange(live, before),
    source: "live",
  };
}

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

type LiveContextValue = {
  status: ConnectionStatus;
  /** Newest first, trimmed to the 15-minute buffer. */
  events: LiveEvent[];
  eventsSeen: number;
  snapshot: StatsSnapshot | null;
  snapshotLoading: boolean;
  snapshotError: string | null;
  reloadSnapshot: () => void;
  range: TimeRange;
  setRange: (range: TimeRange) => void;
  /** The clock the rolling windows are measured against; ticks with the flush. */
  now: number;
  series: ThroughputPoint[];
  bucketSeconds: number;
  hasSeriesData: boolean;
  throughput: Metric;
  latencyP95: Metric;
  cacheHitRate: Metric;
  queueDepth: Metric;
  decisionCounts: Record<Decision, number> | null;
  stageCounts: Record<Stage, number> | null;
};

const LiveContext = createContext<LiveContextValue | null>(null);

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [eventsSeen, setEventsSeen] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [range, setRange] = useState<TimeRange>("5m");
  const [now, setNow] = useState(() => Date.now());

  // Frames can arrive far faster than React should re-render, so they land in a
  // ref and are flushed on a fixed cadence.
  const pendingRef = useRef<LiveEvent[]>([]);

  const snapshot = useAsyncResource<StatsSnapshot>(
    useCallback((signal: AbortSignal) => fetchStats(signal), []),
    { refreshMs: SNAPSHOT_REFRESH_MS },
  );

  useEffect(() => {
    const socket = new LiveSocket({
      onEvent: (event: ModerationEvent) => {
        pendingRef.current.push({ ...event, receivedAt: Date.now() });
      },
      onStatus: setStatus,
    });

    socket.connect();
    return () => socket.close();
  }, []);

  // One timer drives both the buffer flush and the clock the rolling windows
  // are measured against, so the charts advance even while the feed is quiet.
  useEffect(() => {
    const timer = setInterval(() => {
      const arrived = pendingRef.current;
      const stamp = Date.now();
      setNow(stamp);

      if (arrived.length === 0) return;
      pendingRef.current = [];

      setEventsSeen((seen) => seen + arrived.length);
      setEvents((current) => {
        const merged = [...arrived.reverse(), ...current];
        const cutoff = stamp - MAX_BUFFER_MS;
        return merged.filter((e) => e.receivedAt >= cutoff).slice(0, MAX_BUFFER_EVENTS);
      });
    }, FLUSH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const { windowMs, bucketMs } = TIME_RANGES[range];

  const derived = useMemo(() => {
    const halfMs = windowMs / 2;
    const recent = events.filter((e) => e.receivedAt >= now - halfMs);
    const previous = events.filter(
      (e) => e.receivedAt >= now - windowMs && e.receivedAt < now - halfMs,
    );
    const inWindow = events.filter((e) => e.receivedAt >= now - windowMs);

    const snap = snapshot.data;

    const throughput = metricFrom(
      recent,
      previous,
      (sample) => sample.length / (halfMs / 1000),
      snap?.throughput_per_sec,
    );

    const latencyP95 = metricFrom(
      recent,
      previous,
      (sample) => percentile(sample.map((e) => e.latency_ms), 0.95),
      snap?.latency_p95_ms,
    );

    const cacheHitRate = metricFrom(
      recent,
      previous,
      (sample) => (sample.filter((e) => e.stage === "cache").length / sample.length) * 100,
      snap?.cache_hit_rate === undefined
        ? undefined
        : snap.cache_hit_rate <= 1
          ? snap.cache_hit_rate * 100
          : snap.cache_hit_rate,
    );

    // Depth is a queue property, not something the event stream carries.
    const queueDepth: Metric = {
      value: snap?.queue_depth ?? null,
      deltaPct: null,
      source: snap?.queue_depth === undefined ? "none" : "snapshot",
    };

    const liveDecisions = inWindow.length > 0 ? countBy(inWindow, (e) => e.decision, DECISIONS) : null;
    const liveStages = inWindow.length > 0 ? countBy(inWindow, (e) => e.stage, STAGES) : null;

    const snapshotDecisions = snap?.decision_counts
      ? (Object.fromEntries(
          DECISIONS.map((d) => [d, snap.decision_counts?.[d] ?? 0]),
        ) as Record<Decision, number>)
      : null;
    const snapshotStages = snap?.stage_counts
      ? (Object.fromEntries(STAGES.map((s) => [s, snap.stage_counts?.[s] ?? 0])) as Record<
          Stage,
          number
        >)
      : null;

    return {
      series: buildSeries(inWindow, now, windowMs, bucketMs),
      hasSeriesData: inWindow.length > 0,
      throughput,
      latencyP95,
      cacheHitRate,
      queueDepth,
      decisionCounts: liveDecisions ?? snapshotDecisions,
      stageCounts: liveStages ?? snapshotStages,
    };
  }, [events, now, windowMs, bucketMs, snapshot.data]);

  const value = useMemo<LiveContextValue>(
    () => ({
      status,
      events,
      eventsSeen,
      snapshot: snapshot.data,
      snapshotLoading: snapshot.loading,
      snapshotError: snapshot.error,
      reloadSnapshot: snapshot.reload,
      range,
      setRange,
      now,
      bucketSeconds: bucketMs / 1000,
      ...derived,
    }),
    [status, events, eventsSeen, snapshot, range, now, bucketMs, derived],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue {
  const context = useContext(LiveContext);
  if (!context) throw new Error("useLive must be used inside <LiveProvider>");
  return context;
}
