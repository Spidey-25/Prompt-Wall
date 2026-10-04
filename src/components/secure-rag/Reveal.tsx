"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Reveal — wraps a section and fades it in (translateY → 0) only once it
 * scrolls into view. Used to make each dashboard tile appear one-by-one
 * as the user scrolls the page.
 *
 * - `delay` (ms): stagger the reveal when several tiles enter the viewport
 *   in the same scroll frame.
 * - `threshold`: how much of the element must be visible before revealing
 *   (default 0.15 = 15%).
 * - `rootMargin`: shrinks the viewport box so the reveal triggers slightly
 *   before the element is fully in view (default "-40px" off the bottom).
 */
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  rootMargin?: string;
  /** When false, the element renders normally without observer. */
  enabled?: boolean;
}

const Reveal: React.FC<RevealProps> = ({
  children,
  className = "",
  delay = 0,
  threshold = 0.2,
  rootMargin = "0px 0px -80px 0px",
  enabled = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  // Lazy initial state — if disabled or no IntersectionObserver, render visible immediately.
  const [visible, setVisible] = useState(
    () => !enabled || typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, threshold, rootMargin, visible]);

  return (
    <div
      ref={ref}
      className={`reveal h-full ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default Reveal;
