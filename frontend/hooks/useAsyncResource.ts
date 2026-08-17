"use client";

import { useCallback, useEffect, useState } from "react";

import { errorMessage } from "@/lib/api";
import type { AsyncResource } from "@/types/metrics";

type Loader<T> = (signal: AbortSignal) => Promise<T>;

type Options = {
  /** Poll interval in ms. Omit for a one-shot read. */
  refreshMs?: number;
};

/**
 * Runs a fetch and exposes it as { data, loading, error } so every card can
 * distinguish "still loading" from "loaded but empty" from "failed".
 *
 * `loader` must be stable — wrap it in useCallback at the call site.
 */
export function useAsyncResource<T>(
  loader: Loader<T>,
  { refreshMs }: Options = {},
): AsyncResource<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncResource<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const run = async () => {
      try {
        const data = await loader(controller.signal);
        if (active) setState({ data, loading: false, error: null });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setState({ data: null, loading: false, error: errorMessage(error) });
      }
    };

    void run();

    const timer = refreshMs ? setInterval(run, refreshMs) : null;

    return () => {
      active = false;
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [loader, refreshMs, nonce]);

  return { ...state, reload };
}
