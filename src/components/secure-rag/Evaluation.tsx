"use client";

import React from "react";
import type { EvaluationMetrics, MetricCard, MetricIconKind, MetricTone } from "@/types";
import Sparkline from "./Sparkline";

interface EvaluationProps {
  metrics: EvaluationMetrics;
}

const TONE_META: Record<
  MetricTone,
  { color: string; text: string; chipBg: string; bar: string; glow: string }
> = {
  good: {
    color: "#EF4444",
    text: "text-status-allow",
    chipBg: "bg-status-allow/10",
    bar: "bg-status-allow",
    glow: "shadow-glow-green",
  },
  warn: {
    color: "#F87171",
    text: "text-status-warn",
    chipBg: "bg-status-warn/10",
    bar: "bg-status-warn",
    glow: "shadow-glow-yellow",
  },
  info: {
    color: "#DC2626",
    text: "text-accent-blue-bright",
    chipBg: "bg-accent-blue/10",
    bar: "bg-accent-blue",
    glow: "shadow-glow",
  },
  danger: {
    color: "#EF4444",
    text: "text-status-block",
    chipBg: "bg-status-block/10",
    bar: "bg-status-block",
    glow: "shadow-glow-red",
  },
};

// Inline outline-style icons matching the AGENTSHIELD reference
const WarningIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l10 18H2L12 3z" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <circle cx="12" cy="17.5" r="0.6" fill="currentColor" />
  </svg>
);
const CheckIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 12 9 17 20 6" />
  </svg>
);
const AgentsIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="6" height="6" rx="1.5" />
    <rect x="15" y="3" width="6" height="6" rx="1.5" />
    <rect x="9" y="15" width="6" height="6" rx="1.5" />
    <line x1="6" y1="9" x2="6" y2="12" />
    <line x1="18" y1="9" x2="18" y2="12" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="12" y1="12" x2="12" y2="15" />
  </svg>
);
const ShieldCheckIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l8 3v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const ICONS: Record<MetricIconKind, React.FC<{ size?: number }>> = {
  warning: WarningIcon,
  check: CheckIcon,
  agents: AgentsIcon,
  shield: ShieldCheckIcon,
};

const TrendArrow: React.FC<{ direction: "up" | "down" | "flat"; size?: number }> = ({
  direction,
  size = 10,
}) => {
  if (direction === "flat") {
    return (
      <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor">
        <rect x="1" y="4.5" width="8" height="1" rx="0.5" />
      </svg>
    );
  }
  if (direction === "up") {
    return (
      <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor">
        <path d="M5 1l4 5H1z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor">
      <path d="M5 9L1 4h8z" />
    </svg>
  );
};

const TrendBadge: React.FC<NonNullable<MetricCard["trend"]>> = ({
  text,
  direction,
  goodWhenUp,
}) => {
  // good = green, bad = red â€” based on direction + goodWhenUp
  const isUp = direction === "up";
  const isFlat = direction === "flat";
  const positive = goodWhenUp ? isUp : !isUp;
  const color = isFlat ? "#A1A1A1" : positive ? "#EF4444" : "#EF4444";
  const bg = isFlat ? "bg-ink-800" : positive ? "bg-status-allow/10" : "bg-status-block/10";
  return (
    <span
      className={`chip border px-1.5 py-0 text-[10px] font-semibold tabular-nums ${bg}`}
      style={{ color, borderColor: `${color}40` }}
    >
      <TrendArrow direction={direction} />
      {text}
    </span>
  );
};

const Evaluation: React.FC<EvaluationProps> = ({ metrics }) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 w-full">
      {metrics.cards.map((c) => (
        <KpiCard key={c.key} card={c} />
      ))}
    </div>
  );
};

const KpiCard: React.FC<{ card: MetricCard }> = ({ card }) => {
  const t = TONE_META[card.tone];
  const Icon = ICONS[card.iconKind];

  return (
    <div
      className={`hover-lift relative overflow-hidden rounded-xl border border-ink-600 bg-ink-850 p-5 ${t.glow}`}
    >
      {/* Top row: icon chip + trend badge */}
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${t.chipBg} ${t.text}`}
          style={{ boxShadow: "var(--shadow-3d-sm)" }}
        >
          <Icon size={20} />
        </div>
        {card.trend && <TrendBadge {...card.trend} />}
      </div>

      {/* Label */}
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {card.label}
      </div>

      {/* Big value */}
      <div
        className={`tabular-nums mt-1 text-3xl font-extrabold tracking-tight ${t.text}`}
        style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)" }}
      >
        {card.value}
      </div>

      {/* Subtext */}
      {card.subtext && (
        <div className="mt-1 text-[12px] text-slate-500">{card.subtext}</div>
      )}

      {/* Sparkline */}
      <div className="mt-4 -mb-1 flex items-end justify-between gap-2">
        <Sparkline
          data={card.sparkline}
          width={120}
          height={36}
          color={t.color}
          fill
          strokeWidth={2}
        />
        <span className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
          7d
        </span>
      </div>

      {/* Faint baseline rule */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ink-700" style={{ boxShadow: "inset 0 1px 2px 0 rgba(0, 0, 0, 0.30)" }}>
        <div className={`h-full ${t.bar}`} style={{ width: "62%" }} />
      </div>
    </div>
  );
};

export default Evaluation;
