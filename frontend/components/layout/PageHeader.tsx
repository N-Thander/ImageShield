"use client";

import { RefreshCw } from "lucide-react";

import { LiveStatusPill } from "@/components/live/ConnectionStatus";
import { TIME_RANGES, useLive } from "@/components/providers/LiveProvider";
import type { TimeRange } from "@/components/providers/LiveProvider";
import { cn } from "@/lib/cn";

const RANGE_KEYS = Object.keys(TIME_RANGES) as TimeRange[];

/** Segmented control for the rolling window the KPIs and chart are measured over. */
export function RangeControl() {
  const { range, setRange, reloadSnapshot } = useLive();

  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="Time range"
        className="flex items-center gap-0.5 rounded-full border border-hairline bg-card p-0.5"
      >
        {RANGE_KEYS.map((key) => {
          const active = key === range;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              aria-pressed={active}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
                active
                  ? "bg-primary-100 text-primary-700"
                  : "text-muted hover:bg-primary-50 hover:text-primary-700",
              )}
            >
              {TIME_RANGES[key].label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={reloadSnapshot}
        aria-label="Refresh snapshot"
        className="flex size-8 items-center justify-center rounded-full border border-hairline bg-card text-primary-600 transition-colors duration-200 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        <RefreshCw className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

type PageHeaderProps = {
  title: string;
  blurb?: string;
  /** The range picker only makes sense on pages driven by the live window. */
  showRange?: boolean;
  action?: React.ReactNode;
};

export function PageHeader({ title, blurb, showRange = false, action }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {blurb && <p className="mt-1 text-sm text-muted">{blurb}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {action}
        {showRange && <RangeControl />}
        <LiveStatusPill />
      </div>
    </header>
  );
}
