"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 550;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tweens a KPI value toward `target` on every change.
 *
 * While no animation is in flight the target is returned straight through, so
 * state is only written from inside the rAF callback — never synchronously
 * during the effect. A null target means "unknown" and passes through as null,
 * letting the tile render an em dash instead of counting up to a made-up number.
 */
export function useCountUp(target: number | null, durationMs = DEFAULT_DURATION_MS): number | null {
  const [tween, setTween] = useState<number | null>(null);
  const displayedRef = useRef<number>(target ?? 0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      displayedRef.current = 0;
      return;
    }

    const from = displayedRef.current;
    if (from === target || prefersReducedMotion()) {
      displayedRef.current = target;
      return;
    }

    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);

      if (progress < 1) {
        const next = from + (target - from) * easeOutCubic(progress);
        displayedRef.current = next;
        setTween(next);
        frameRef.current = requestAnimationFrame(step);
      } else {
        displayedRef.current = target;
        setTween(null);
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return target === null ? null : (tween ?? target);
}
