import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/cn";
import { EM_DASH } from "@/lib/format";
import { STAGE_LABELS } from "@/types/metrics";
import type { Decision, ServiceStatus, Stage } from "@/types/metrics";

/* -------------------------------------------------------------------------- */
/* Decision pill                                                               */
/* -------------------------------------------------------------------------- */

const DECISION_STYLES: Record<Decision | "PENDING", string> = {
  SAFE: "bg-safe-bg text-safe-fg",
  REVIEW: "bg-review-bg text-review-fg",
  BLOCK: "bg-block-bg text-block-fg",
  PENDING: "bg-primary-50 text-primary-600",
};

export function DecisionPill({
  decision,
  className,
}: {
  decision: Decision | "PENDING";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        DECISION_STYLES[decision],
        className,
      )}
    >
      {decision}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage pill                                                                  */
/* -------------------------------------------------------------------------- */

export function StagePill({ stage, className }: { stage: Stage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-hairline bg-primary-50/60 px-2.5 py-0.5 text-[11px] font-medium text-primary-700",
        className,
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Status dot                                                                  */
/* -------------------------------------------------------------------------- */

const STATUS_DOT: Record<ServiceStatus, string> = {
  up: "bg-safe-dot",
  degraded: "bg-review-dot",
  down: "bg-block-dot",
  unknown: "bg-primary-200",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  up: "Up",
  degraded: "Degraded",
  down: "Down",
  unknown: "Unknown",
};

export function StatusDot({
  status,
  pulse = false,
  className,
}: {
  status: ServiceStatus;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-2 shrink-0 rounded-full",
          STATUS_DOT[status],
          pulse && status === "up" && "animate-live-pulse",
          className,
        )}
      />
      <span className="sr-only">{STATUS_LABEL[status]}</span>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Trend delta                                                                 */
/* -------------------------------------------------------------------------- */

/** Whether a rising number is good news for this metric. */
export type Polarity = "higher-is-better" | "lower-is-better" | "neutral";

export function TrendDelta({
  deltaPct,
  polarity = "higher-is-better",
  className,
}: {
  deltaPct: number | null;
  polarity?: Polarity;
  className?: string;
}) {
  if (deltaPct === null || !Number.isFinite(deltaPct)) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted", className)}>
        <Minus className="size-3" aria-hidden="true" />
        <span className="tnum">{EM_DASH}</span>
        <span className="sr-only">no comparable previous period</span>
      </span>
    );
  }

  const rising = deltaPct >= 0;
  const good =
    polarity === "neutral" ? null : polarity === "higher-is-better" ? rising : !rising;

  const tone =
    Math.abs(deltaPct) < 0.5
      ? "text-muted"
      : good === null
        ? "text-primary-600"
        : good
          ? "text-safe-fg"
          : "text-block-fg";

  const Icon = rising ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", tone, className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="tnum">
        {rising ? "+" : ""}
        {deltaPct.toFixed(1)}%
      </span>
      <span className="sr-only">versus the previous period</span>
    </span>
  );
}
