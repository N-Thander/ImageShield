import { CircleAlert, Inbox, RefreshCw } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * "Loaded, but there is genuinely nothing here yet." Distinct from ErrorState
 * so a reader can tell an idle pipeline from a broken endpoint.
 */
export function EmptyState({
  title = "No data yet",
  message,
  className,
}: {
  title?: string;
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline bg-primary-50/40 px-6 py-10 text-center",
        className,
      )}
    >
      <Inbox className="size-5 text-primary-300" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-muted">{message}</p>
    </div>
  );
}

/** The read failed — say so plainly and offer a retry. Never fall back to fake numbers. */
export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-block-dot/40 bg-block-bg/50 px-6 py-10 text-center",
        className,
      )}
    >
      <CircleAlert className="size-5 text-block-fg" aria-hidden="true" />
      <p className="text-sm font-medium text-block-fg">No data yet</p>
      <p className="max-w-sm text-xs leading-relaxed break-words text-block-fg/80">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-block-dot/40 bg-card px-3 py-1.5 text-xs font-medium text-block-fg transition-colors hover:bg-block-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}
