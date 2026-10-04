"use client";

import React from "react";
import type { EvaluationRunSummary } from "@/lib/api/backendClient";

interface Props {
  summary: EvaluationRunSummary | null;
  pipeline?: Record<string, unknown> | null;
}

const NODES = [
  { id: "input", title: "Input", detail: "Request intake", x: 90, y: 210, latency: null },
  { id: "scope", title: "Scope", detail: "Boundary extraction", x: 260, y: 100, latencyKey: "avg_scope_extraction_latency_ms" },
  { id: "rag", title: "RAG", detail: "Context retrieval", x: 260, y: 320, latency: null },
  { id: "firewall", title: "Firewall", detail: "Content inspection", x: 480, y: 210, latencyKey: "avg_content_firewall_latency_ms" },
  { id: "plan", title: "Plan", detail: "Action planning", x: 680, y: 100, latencyKey: "avg_planning_latency_ms" },
  { id: "guard", title: "Guard", detail: "Authorization", x: 680, y: 320, latencyKey: "avg_action_guard_latency_ms" },
  { id: "tools", title: "Tools", detail: "Sandbox execution", x: 875, y: 210, latency: null },
  { id: "output", title: "Output", detail: "Safe response", x: 680, y: 450, latency: null },
] as const;

const EDGES = [
  ["input", "scope"],
  ["input", "rag"],
  ["scope", "firewall"],
  ["rag", "firewall"],
  ["firewall", "plan"],
  ["firewall", "guard"],
  ["plan", "guard"],
  ["guard", "tools"],
  ["guard", "output"],
  ["tools", "output"],
] as const;

function formatLatency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Awaiting run";
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value.toFixed(0)}ms`;
}

export default function EvaluationPipelineGraph({ summary, pipeline }: Props) {
  const positions = new Map(NODES.map((node) => [node.id, node]));
  const auditEvents = Array.isArray(pipeline?.audit_events) ? pipeline.audit_events as Array<{ event_type?: string }> : [];
  const completedStages = new Set(
    auditEvents.map((event) => event.event_type?.toLowerCase().replaceAll("_", " ") || "")
  );
  return (
    <div className="overflow-x-auto pb-3" style={{ perspective: "1400px" }}>
      <div
        className="relative mx-auto h-[540px] min-w-[1080px] max-w-[1180px] overflow-hidden rounded-2xl border border-ink-600 bg-[radial-gradient(circle_at_50%_35%,rgba(220,38,38,0.13),transparent_45%),#09090b]"
        style={{ transform: "rotateX(7deg) rotateY(-2deg)", transformStyle: "preserve-3d", boxShadow: "0 24px 45px rgba(0,0,0,.28)" }}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1080 540" aria-label="Relational LangGraph execution graph">
          <defs>
            <linearGradient id="graph-edge" x1="0" x2="1">
              <stop offset="0%" stopColor="#F87171" stopOpacity=".35" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity=".9" />
            </linearGradient>
            <filter id="graph-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {EDGES.map(([from, to]) => {
            const a = positions.get(from)!;
            const b = positions.get(to)!;
            const midX = (a.x + b.x) / 2;
            return (
              <path
                key={`${from}-${to}`}
                d={`M ${a.x + 55} ${a.y + 35} C ${midX} ${a.y + 35}, ${midX} ${b.y + 35}, ${b.x} ${b.y + 35}`}
                fill="none"
                stroke="url(#graph-edge)"
                strokeWidth="2"
                strokeDasharray="5 5"
                filter="url(#graph-glow)"
              />
            );
          })}
        </svg>
        {NODES.map((node, index) => {
          const value = "latencyKey" in node && summary
            ? summary[node.latencyKey as keyof EvaluationRunSummary] as number
            : null;
          const stageComplete =
            completedStages.size > 0 &&
            (node.id === "input" ||
              [...completedStages].some((event) => event.includes(node.title.toLowerCase())));
          return (
            <div
              key={node.id}
              className={`absolute w-[150px] rounded-xl border bg-ink-850/95 p-3 text-center backdrop-blur ${
                stageComplete ? "border-status-allow/60" : "border-red-400/35"
              }`}
              style={{ left: node.x - 55, top: node.y, transform: "translateZ(35px)", boxShadow: "0 12px 25px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)" }}
            >
              <div className={`text-[10px] font-mono font-bold ${stageComplete ? "text-status-allow" : "text-red-300"}`}>{stageComplete ? "DONE" : String(index + 1).padStart(2, "0")}</div>
              <div className="mt-1 text-sm font-bold text-white">{node.title}</div>
              <div className="mt-1 text-[10px] text-slate-400">{node.detail}</div>
              <div className="mt-3 text-[10px] font-mono text-slate-500">{formatLatency(value)}</div>
            </div>
          );
        })}
        <div className="absolute bottom-3 left-4 text-[10px] font-mono uppercase tracking-widest text-slate-500">
          Relational execution topology
        </div>
      </div>
    </div>
  );
}
