"use client";

import React from "react";
import type { EventSeverity, LiveSecurityEvent } from "@/types";

interface LiveEventStreamProps {
  events: LiveSecurityEvent[];
  onSelect?: (event: LiveSecurityEvent) => void;
}

const SEVERITY_META: Record<
  EventSeverity,
  { color: string; bg: string; border: string; dot: string }
> = {
  LOW: { color: "#22C55E", bg: "bg-status-allow/10", border: "border-status-allow/30", dot: "✓" },
  MEDIUM: { color: "#F59E0B", bg: "bg-status-warn/10", border: "border-status-warn/30", dot: "⚠" },
  HIGH: { color: "#EF4444", bg: "bg-status-block/10", border: "border-status-block/30", dot: "🛑" },
  CRITICAL: { color: "#EF4444", bg: "bg-status-block/15", border: "border-status-block/50", dot: "🛑" },
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const LiveEventStream: React.FC<LiveEventStreamProps> = ({ events, onSelect }) => {
  return (
    <section className="card card-pad h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title">Live Security Events</h2>
        <span className="chip border border-status-allow/30 bg-status-allow/10 text-[10px] font-semibold uppercase tracking-wider text-status-allow">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-allow animate-pulse-soft" />
          streaming
        </span>
      </div>

      <ol className="space-y-1.5">
        {events.map((ev) => {
          const s = SEVERITY_META[ev.severity];
          return (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => onSelect?.(ev)}
                className={`hover-lift flex w-full items-center gap-3 rounded-lg border ${s.border} ${s.bg} px-3 py-2.5 text-left transition-all`}
                style={{ boxShadow: "var(--shadow-3d-sm)" }}
              >
                <span className="font-mono text-[11px] tabular-nums text-slate-500">
                  {fmtTime(ev.timestamp)}
                </span>
                <span className="text-base leading-none">{s.dot}</span>
                <span className="flex-1 text-[13px] text-slate-200">
                  {ev.message}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: s.color }}
                >
                  {ev.severity}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default LiveEventStream;
