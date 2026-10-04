"use client";

import React, { useEffect, useRef, useState } from "react";
import type { SecurityMetrics } from "@/types";

interface MetricsStripProps {
  metrics: SecurityMetrics;
}

/**
 * MetricsStrip — compact horizontal strip of real-time security metrics.
 * Uses animated count-up transitions. Wire to backend metrics endpoint later.
 */
const MetricsStrip: React.FC<MetricsStripProps> = ({ metrics }) => {
  const items: { key: string; label: string; value: number; suffix?: string; color: string }[] = [
    { key: "scanned", label: "Requests Scanned", value: metrics.requestsScanned, color: "#A1A1A1" },
    { key: "threats", label: "Threats Detected", value: metrics.threatsDetected, color: "#F59E0B" },
    { key: "blocked", label: "Actions Blocked", value: metrics.actionsBlocked, color: "#EF4444" },
    { key: "approvals", label: "Human Approvals", value: metrics.humanApprovals, color: "#FF6A00" },
    { key: "latency", label: "Average Latency", value: metrics.averageLatencyMs, suffix: "ms", color: "#22C55E" },
  ];

  return (
    <section className="card h-full">
      <div className="grid grid-cols-2 divide-x divide-ink-600 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item, idx) => (
          <div
            key={item.key}
            className={`px-5 py-4 ${idx >= 2 ? "border-t border-ink-600 sm:border-t-0" : ""} ${idx === 4 ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {item.label}
            </div>
            <CountUp
              value={item.value}
              suffix={item.suffix}
              color={item.color}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

/** Animated count-up hook — animates from 0 to value on mount. */
const CountUp: React.FC<{ value: number; suffix?: string; color: string }> = ({
  value,
  suffix = "",
  color,
}) => {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const formatted =
    suffix === "ms"
      ? `${(display / 1000).toFixed(2)}s`
      : display.toLocaleString("en-US");

  return (
    <div
      className="tabular-nums mt-1 text-2xl font-extrabold tracking-tight"
      style={{ color, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
    >
      {formatted}
    </div>
  );
};

export default MetricsStrip;
