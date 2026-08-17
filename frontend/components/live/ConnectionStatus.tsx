"use client";

import { Loader2, Wifi, WifiOff } from "lucide-react";

import { useLive } from "@/components/providers/LiveProvider";
import { cn } from "@/lib/cn";
import { WS_URL } from "@/lib/env";
import type { ConnectionStatus } from "@/types/metrics";

const COPY: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  open: "Live",
  reconnecting: "Reconnecting…",
  closed: "Disconnected",
};

/** Header pill: pulses green while the feed is attached, greys out when not. */
export function LiveStatusPill({ className }: { className?: string }) {
  const { status } = useLive();
  const live = status === "open";

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        live
          ? "border-safe-dot/30 bg-safe-bg text-safe-fg"
          : "border-hairline bg-primary-50 text-muted",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-2 rounded-full",
          live ? "animate-live-pulse bg-safe-dot" : "bg-primary-200",
        )}
      />
      {COPY[status]}
    </span>
  );
}

/**
 * Non-alarming banner shown only while the socket is down. Deliberately
 * informational (lavender, not red) — a dropped feed is expected during a
 * backend restart and the socket retries on its own.
 */
export function ReconnectBanner() {
  const { status } = useLive();
  if (status === "open") return null;

  const connecting = status === "connecting" || status === "reconnecting";
  const Icon = connecting ? Loader2 : WifiOff;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-hairline bg-primary-50/80 px-4 py-3 text-xs text-primary-800"
    >
      <Icon
        className={cn("size-4 shrink-0 text-primary-500", connecting && "animate-spin")}
        aria-hidden="true"
      />
      <span className="font-semibold">
        {connecting ? "Reconnecting to the live feed…" : "Live feed disconnected."}
      </span>
      <span className="text-muted">
        Retrying with backoff against <code className="font-mono">{WS_URL}/live</code>. Figures
        below fall back to the last <code className="font-mono">/stats</code> snapshot.
      </span>
    </div>
  );
}

/** Compact variant for cards that want an inline connection hint. */
export function LiveHint() {
  const { status } = useLive();
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted">
        <Wifi className="size-3" aria-hidden="true" />
        streaming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
      <WifiOff className="size-3" aria-hidden="true" />
      not streaming
    </span>
  );
}
