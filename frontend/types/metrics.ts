/**
 * Shared wire shapes for the ImageShield dashboard.
 *
 * Everything here mirrors what the API is expected to return. Fields are
 * optional wherever the backend may not implement them yet — the UI renders
 * "—" or a skeleton for anything missing rather than inventing a number.
 */

export type Decision = "SAFE" | "REVIEW" | "BLOCK";

export const DECISIONS: readonly Decision[] = ["SAFE", "REVIEW", "BLOCK"];

/** Cascade stage that produced the decision, cheapest first. */
export type Stage = "cache" | "phash" | "cheap_model" | "heavy_model";

export const STAGES: readonly Stage[] = ["cache", "phash", "cheap_model", "heavy_model"];

export const STAGE_LABELS: Record<Stage, string> = {
  cache: "Cache",
  phash: "Perceptual hash",
  cheap_model: "Cheap model",
  heavy_model: "Heavy model",
};

/** A single moderation result, streamed over the live WebSocket. */
export type ModerationEvent = {
  image_id: string;
  decision: Decision;
  nsfw_score: number;
  stage: Stage;
  latency_ms: number;
  model_version: string;
  /** ISO-8601 timestamp. */
  ts: string;
};

/** Rolling aggregates from `GET /stats`, used to seed the UI before the first event. */
export type StatsSnapshot = {
  throughput_per_sec?: number;
  latency_p50_ms?: number;
  latency_p95_ms?: number;
  latency_p99_ms?: number;
  decision_counts?: Partial<Record<Decision, number>>;
  stage_counts?: Partial<Record<Stage, number>>;
  cache_hit_rate?: number;
  queue_depth?: number;
  total_processed?: number;
  window_seconds?: number;
};

/* -------------------------------------------------------------------------- */
/* Per-service metrics                                                         */
/* -------------------------------------------------------------------------- */

export type ServiceKey = "postgres" | "redis" | "queue" | "storage";

export type ServiceStatus = "up" | "degraded" | "down" | "unknown";

type ServiceCommon = {
  status?: ServiceStatus;
  latency_ms?: number;
};

export type PostgresMetrics = ServiceCommon & {
  row_counts?: Partial<Record<Decision | "PENDING", number>>;
  total_rows?: number;
  table_size_bytes?: number;
  inserts_last_minute?: number;
  recent_inserts?: {
    image_id: string;
    decision: Decision | "PENDING";
    created_at: string;
  }[];
};

export type RedisMetrics = ServiceCommon & {
  cache_hit_rate?: number;
  hits?: number;
  misses?: number;
  keyspace_size?: number;
  memory_used_bytes?: number;
  memory_peak_bytes?: number;
  evicted_keys?: number;
};

export type QueueMetrics = ServiceCommon & {
  consumer_lag?: number;
  queue_depth?: number;
  topic?: string;
  partitions?: number;
  messages_per_sec?: number;
  depth_series?: { ts: string; depth: number; lag?: number }[];
};

export type StorageMetrics = ServiceCommon & {
  object_count?: number;
  bytes_stored?: number;
  bucket?: string;
  console_url?: string;
};

export type ServiceMetricsMap = {
  postgres: PostgresMetrics;
  redis: RedisMetrics;
  queue: QueueMetrics;
  storage: StorageMetrics;
};

/* -------------------------------------------------------------------------- */
/* Ingestion + benchmarks                                                      */
/* -------------------------------------------------------------------------- */

export type IngestionStats = {
  inbox_count?: number;
  processed_count?: number;
  failed_count?: number;
  in_flight?: number;
  decision_counts?: Partial<Record<Decision, number>>;
  last_batch_at?: string;
  batch_rate_per_sec?: number;
};

export type BenchmarkRun = {
  id: string;
  name: string;
  started_at: string;
  images: number;
  throughput_per_sec: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  cache_hit_rate?: number;
};

/* -------------------------------------------------------------------------- */
/* Derived client-side shapes                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A live event once it has been received by the browser. `receivedAt` is the
 * client's own arrival clock: rolling windows key off it rather than `ts` so a
 * skewed server clock cannot empty the charts.
 */
export type LiveEvent = ModerationEvent & { receivedAt: number };

/** One bucket of the throughput time-series, split by decision. */
export type ThroughputPoint = {
  /** Bucket start, epoch ms — kept numeric so Recharts can scale it. */
  t: number;
  label: string;
  SAFE: number;
  REVIEW: number;
  BLOCK: number;
  total: number;
};

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

/** A KPI value plus its period-over-period change, either of which may be unknown. */
export type Metric = {
  value: number | null;
  /** Percentage change vs. the preceding half-window; null when not comparable. */
  deltaPct: number | null;
  /** Where the number came from, so tiles can label a stale snapshot honestly. */
  source: "live" | "snapshot" | "none";
};

/** Wrapper for any async read, so cards can distinguish empty from failed. */
export type AsyncResource<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};
