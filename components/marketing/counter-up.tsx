"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Final value to animate to. */
  to: number;
  /** Duration in ms. Defaults to 1200. */
  duration?: number;
  /** Suffix appended after the number, e.g. "+", "%". */
  suffix?: string;
  /** Prefix prepended before the number. */
  prefix?: string;
  /** Decimal places. Defaults to 0. */
  decimals?: number;
};

/**
 * Counts up from 0 → `to` once the element scrolls into view (50% visible).
 * Uses a single rAF loop and writes textContent imperatively to avoid
 * re-rendering React 60× per second. Ease-out cubic for a soft landing.
 */
export function CounterUp({ to, duration = 1200, suffix = "", prefix = "", decimals = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      node.textContent = `${prefix}${to.toFixed(decimals)}${suffix}`;
      return;
    }

    const format = (value: number) => `${prefix}${value.toFixed(decimals)}${suffix}`;
    node.textContent = format(0);

    let raf = 0;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // ease-out cubic
          const eased = 1 - Math.pow(1 - t, 3);
          node.textContent = format(to * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    obs.observe(node);

    return () => {
      obs.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to, duration, suffix, prefix, decimals]);

  return <span ref={ref} aria-label={`${prefix}${to}${suffix}`}>{prefix}0{suffix}</span>;
}
