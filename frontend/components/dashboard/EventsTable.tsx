"use client";

import { useEffect, useRef, useState } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { DecisionPill, StagePill } from "@/components/ui/Pills";
import { EmptyState } from "@/components/ui/States";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useLive } from "@/components/providers/LiveProvider";
import { formatClock, formatMs, formatScore, shortId } from "@/lib/format";
import type { LiveEvent } from "@/types/metrics";

const MAX_ROWS = 40;
const NEW_BADGE_MS = 4000;

function rowKey(event: LiveEvent): string {
  // The same image can be re-processed, so the arrival stamp disambiguates.
  return `${event.image_id}-${event.receivedAt}`;
}

/** Tracks which rows arrived in the last few seconds so they can be badged. */
function useRecentRows(events: LiveEvent[]): Set<string> {
  const [recent, setRecent] = useState<Set<string>>(() => new Set());
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fresh = events.map(rowKey).filter((key) => !seenRef.current.has(key));
    if (fresh.length === 0) return;

    for (const key of fresh) seenRef.current.add(key);
    setRecent((current) => new Set([...current, ...fresh]));

    const timer = setTimeout(() => {
      setRecent((current) => {
        const next = new Set(current);
        for (const key of fresh) next.delete(key);
        return next;
      });
    }, NEW_BADGE_MS);

    return () => clearTimeout(timer);
  }, [events]);

  return recent;
}

const HEAD_CELL =
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted";

export function EventsTable() {
  const { events, status, eventsSeen } = useLive();
  const recent = useRecentRows(events);
  const rows = events.slice(0, MAX_ROWS);

  return (
    <Card aria-labelledby="events-heading" className="flex flex-col gap-4">
      <CardHeader
        id="events-heading"
        title="Recent moderation events"
        hint={
          eventsSeen > 0
            ? `${eventsSeen.toLocaleString("en-US")} events received this session`
            : "Streaming from the live WebSocket"
        }
      />

      {rows.length === 0 ? (
        status === "connecting" ? (
          <SkeletonRows rows={6} />
        ) : (
          <EmptyState message="Nothing has come through the live feed yet. Events appear here the moment the pipeline emits them." />
        )
      ) : (
        <div className="-mx-2 max-h-[420px] overflow-y-auto scroll-slim px-2">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Most recent moderation results, newest first
            </caption>
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-hairline">
                <th scope="col" className={HEAD_CELL}>
                  Image
                </th>
                <th scope="col" className={HEAD_CELL}>
                  Decision
                </th>
                <th scope="col" className={`${HEAD_CELL} text-right`}>
                  Score
                </th>
                <th scope="col" className={HEAD_CELL}>
                  Stage
                </th>
                <th scope="col" className={`${HEAD_CELL} text-right`}>
                  Latency
                </th>
                <th scope="col" className={`${HEAD_CELL} text-right`}>
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => {
                const key = rowKey(event);
                const isNew = recent.has(key);

                return (
                  <tr
                    key={key}
                    className="animate-row-in border-b border-hairline/50 last:border-0"
                  >
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <code className="font-mono text-xs text-ink">
                          {shortId(event.image_id)}
                        </code>
                        {isNew && (
                          <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-primary-700">
                            ← NEW
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <DecisionPill decision={event.decision} />
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-xs text-ink">
                      {formatScore(event.nsfw_score)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StagePill stage={event.stage} />
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-xs text-ink">
                      {formatMs(event.latency_ms)}
                      <span className="text-muted"> ms</span>
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-xs text-muted">
                      {formatClock(event.ts)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
