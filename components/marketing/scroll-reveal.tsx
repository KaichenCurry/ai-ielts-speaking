"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

/**
 * Lightweight reveal-on-scroll wrapper. The element starts invisible and
 * translated 16px down; once it intersects the viewport (15% threshold)
 * it transitions to visible. Stays visible after — no re-trigger.
 *
 * Why a tiny client component instead of CSS scroll-timeline?
 *   - `animation-timeline: view()` is still gated behind feature flags in
 *     several browsers; IntersectionObserver works everywhere.
 *   - This pattern composes: caller passes `delay` to stagger nearby items.
 */
type Props = {
  children: ReactNode;
  delay?: number;
  /** Slide-up distance in px before reveal. Defaults to 16. */
  offset?: number;
  /** Threshold of element visibility before triggering. Defaults to 0.15. */
  threshold?: number;
  className?: string;
  as?: "div" | "section" | "article" | "header" | "footer";
};

export function ScrollReveal({
  children,
  delay = 0,
  offset = 16,
  threshold = 0.15,
  className,
  as = "div",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);

  const style: CSSProperties = {
    transition: "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
    transitionDelay: `${delay}ms`,
    opacity: visible ? 1 : 0,
    transform: visible ? "translate3d(0,0,0)" : `translate3d(0, ${offset}px, 0)`,
    willChange: "opacity, transform",
  };

  // Render with the requested element. The ref is typed as HTMLDivElement;
  // this is intentional — the wrapper just needs to know when it scrolls
  // into view, and every supported tag is an HTMLElement subclass.
  const Tag = as as "div";
  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
