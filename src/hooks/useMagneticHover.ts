"use client";

import { useEffect, useRef } from "react";

/**
 * useMagneticHover — makes an element "pull" toward the cursor on hover.
 * The element translates a fraction of the mouse offset from its center,
 * then springs back when the mouse leaves. Subtle, premium effect.
 *
 * Usage: const ref = useMagneticHover(); <a ref={ref}>...</a>
 */
export function useMagneticHover<T extends HTMLElement = HTMLAnchorElement>(strength = 0.2) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    // Skip on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate(${x * strength}px, ${y * strength * 0.6}px)`;
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [strength]);

  return ref;
}
