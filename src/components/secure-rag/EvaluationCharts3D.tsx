"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { EvaluationRunSummary } from "@/lib/api/backendClient";

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-ink-600 bg-ink-900/95 p-3 shadow-2xl backdrop-blur-md text-xs">
        <p className="font-bold text-white mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-[11px] py-0.5">
            <span
              className="h-2.5 w-2.5 rounded-full inline-block"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-slate-300">{entry.name}:</span>
            <span className="font-mono font-bold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface Props {
  evaluationSummary?: EvaluationRunSummary | null;
}

export default function EvaluationCharts3D({ evaluationSummary }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-64 w-full animate-pulse bg-ink-850 rounded-xl" />;
  }

  const hasRealData = evaluationSummary && evaluationSummary.total_tests > 0;

  // ─── Chart 1: Detection by Category — real data when available ───────────────
  const vectorData = hasRealData
    ? (() => {
        const results = evaluationSummary!.results;
        const categories = [
          { name: "BENIGN", label: "Normal" },
          { name: "PROMPT_INJECTION", label: "Malicious Instruction" },
          { name: "FAKE_AUTHORITY", label: "Fake System Instruction" },
          { name: "TOOL_MANIPULATION", label: "Unauthorized Tool Request" },
          { name: "DATA_EXFILTRATION", label: "Unauthorized Data Sharing" },
          { name: "ENCODED_INJECTION", label: "Hidden / Encoded Instruction" },
          { name: "AMBIGUOUS", label: "Ambiguous" },
          { name: "UNAUTHORIZED_ACTION", label: "Unauthorized Action" },
        ];
        return categories
          .map((cat) => {
            const catResults = results.filter((r) => r.category === cat.name);
            if (catResults.length === 0) return null;
            const blocked = catResults.filter((r) => r.action_blocked).length;
            const detected = catResults.filter((r) => r.threat_detected).length;
            return { name: cat.label, Detected: detected, Blocked: blocked };
          })
          .filter(Boolean);
      })()
    : [
        { name: "Plain Text", Detected: 0, Blocked: 0 },
        { name: "Encoded", Detected: 0, Blocked: 0 },
        { name: "Fake System", Detected: 0, Blocked: 0 },
        { name: "Tool Exploits", Detected: 0, Blocked: 0 },
      ];

  // ─── Chart 2: PASS vs FAIL by category ───────────────────────────────────────
  const passFailData = hasRealData
    ? (() => {
        const results = evaluationSummary!.results;
        const catMap: Record<string, string> = {
          BENIGN: "Normal",
          PROMPT_INJECTION: "Malicious Instruction",
          FAKE_AUTHORITY: "Fake System Instruction",
          ENCODED_INJECTION: "Hidden / Encoded Instruction",
          TOOL_MANIPULATION: "Unauthorized Tool Request",
          DATA_EXFILTRATION: "Unauthorized Data Sharing",
          AMBIGUOUS: "Ambiguous",
          UNAUTHORIZED_ACTION: "Unauthorized Action",
        };
        const cats = Array.from(new Set(results.map((r) => r.category)));
        return cats.map((cat) => {
          const catR = results.filter((r) => r.category === cat);
          const label = catMap[cat] || cat.replace("_", " ");
          return {
            name: label.length > 15 ? label.slice(0, 15) + "…" : label,
            Pass: catR.filter((r) => r.passed).length,
            Fail: catR.filter((r) => !r.passed).length,
          };
        });
      })()
    : [
        { name: "Normal", Pass: 0, Fail: 0 },
        { name: "Malicious Instruction", Pass: 0, Fail: 0 },
        { name: "Fake System Instruction", Pass: 0, Fail: 0 },
        { name: "Ambiguous", Pass: 0, Fail: 0 },
      ];

  // ─── Chart 3: Latency per test (area chart) ───────────────────────────────────
  const latencyTrendData = hasRealData
    ? evaluationSummary!.results.map((r, i) => ({
        test: `T${i + 1}`,
        Latency: Math.round(r.latency_ms),
      }))
    : [{ test: "—", Latency: 0 }];

  // ─── Chart 4: Decision distribution (pie) ─────────────────────────────────────
  const decisionPieData = hasRealData
    ? (() => {
        const results = evaluationSummary!.results;
        const allow = results.filter((r) => r.actual_decision === "ALLOW").length;
        const block = results.filter((r) => r.actual_decision === "BLOCK").length;
        const ask = results.filter((r) => r.actual_decision === "ASK_HUMAN").length;
        return [
          { name: "Allowed", value: allow, color: "#22C55E" },
          { name: "Blocked", value: block, color: "#EF4444" },
          { name: "Needs Your Approval", value: ask, color: "#F59E0B" },
        ].filter((d) => d.value > 0);
      })()
    : [
        { name: "Allowed", value: 0, color: "#22C55E" },
        { name: "Blocked", value: 0, color: "#EF4444" },
        { name: "Needs Your Approval", value: 0, color: "#F59E0B" },
      ];

  // ─── Chart 5: Per-stage latency breakdown ─────────────────────────────────────
  const stagLatencyData = hasRealData
    ? [
        { stage: "Scope Extraction", Latency: Math.round(evaluationSummary!.avg_scope_extraction_latency_ms) },
        { stage: "Content Security Check", Latency: Math.round(evaluationSummary!.avg_content_firewall_latency_ms) },
        { stage: "AI Planning", Latency: Math.round(evaluationSummary!.avg_planning_latency_ms) },
        { stage: "Action Permission Check", Latency: Math.round(evaluationSummary!.avg_action_guard_latency_ms) },
      ]
    : [
        { stage: "Scope Extraction", Latency: 0 },
        { stage: "Content Security Check", Latency: 0 },
        { stage: "AI Planning", Latency: 0 },
        { stage: "Action Permission Check", Latency: 0 },
      ];

  // ─── Chart 6: Legitimate tasks vs attacks ─────────────────────────────────────
  const completionData = hasRealData
    ? [
        {
          tier: "Normal",
          Completed: evaluationSummary!.legitimate_tasks_completed_count,
          Failed: evaluationSummary!.false_positives,
        },
        {
          tier: "Attack",
          Completed: evaluationSummary!.attack_tests_count - evaluationSummary!.false_negatives,
          Failed: evaluationSummary!.false_negatives,
        },
        {
          tier: "Ambiguous",
          Completed: evaluationSummary!.ask_human_count,
          Failed: evaluationSummary!.ambiguous_tests_count - evaluationSummary!.ask_human_count,
        },
      ]
    : [
        { tier: "Normal", Completed: 0, Failed: 0 },
        { tier: "Attack", Completed: 0, Failed: 0 },
        { tier: "Ambiguous", Completed: 0, Failed: 0 },
      ];

  const interceptRate = hasRealData ? evaluationSummary!.interception_rate_pct.toFixed(1) : "—";
  const benignRate = hasRealData ? evaluationSummary!.benign_completion_rate_pct.toFixed(1) : "—";
  const passRate =
    hasRealData && evaluationSummary!.total_tests > 0
      ? Math.round((evaluationSummary!.passed_tests / evaluationSummary!.total_tests) * 100).toFixed(1)
      : "—";
  const avgLatency = hasRealData ? `${(evaluationSummary!.average_latency_ms / 1000).toFixed(2)}s` : "—";

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 w-full">
      {/* Chart 1: Detection by Vector Category */}
      <div className="surface-sunken flex flex-col justify-between p-4 rounded-xl border border-ink-600 hover-lift shadow-lg">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-white">Threats Found by Type</span>
            <span className="chip border border-accent-blue/40 bg-accent-blue/10 text-[10px] font-mono text-accent-blue">
              {interceptRate}% Intercept
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {hasRealData ? "Real detections & blocks per attack category" : "Awaiting real evaluation data"}
          </p>
        </div>
        <div className="h-48 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vectorData as any[]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6A00" stopOpacity={1} />
                  <stop offset="100%" stopColor="#993F00" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="barGradientSecondary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFC21A" stopOpacity={1} />
                  <stop offset="100%" stopColor="#997410" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Detected" fill="url(#barGradientSecondary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Blocked" fill="url(#barGradientPrimary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: PASS vs FAIL by category */}
      <div className="surface-sunken flex flex-col justify-between p-4 rounded-xl border border-ink-600 hover-lift shadow-lg">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-white">Test Results by Type</span>
            <span className="chip border border-status-allow/40 bg-status-allow/10 text-[10px] font-mono text-status-allow">
              {passRate}% Pass Rate
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {hasRealData ? "Correctness evaluation from real execution" : "Awaiting real evaluation data"}
          </p>
        </div>
        <div className="h-48 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={passFailData as any[]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={1} />
                  <stop offset="100%" stopColor="#14532D" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                  <stop offset="100%" stopColor="#7F1D1D" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Pass" fill="url(#passGrad)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Fail" fill="url(#failGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Per-test Latency trend */}
      <div className="surface-sunken flex flex-col justify-between p-4 rounded-xl border border-ink-600 hover-lift shadow-lg">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-white">Time Taken Per Test</span>
            <span className="chip border border-accent-blue/40 bg-accent-blue/10 text-[10px] font-mono text-accent-blue">
              avg {avgLatency}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {hasRealData ? "Real measured latency per test case (ms)" : "Awaiting real evaluation data"}
          </p>
        </div>
        <div className="h-48 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={latencyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6A00" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#FF6A00" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="test" stroke="#94A3B8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} unit="ms" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="Latency"
                stroke="#FF6A00"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#latencyAreaGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 4: Decision Distribution Pie */}
      <div className="surface-sunken flex flex-col justify-between p-4 rounded-xl border border-ink-600 hover-lift shadow-lg">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-white">Security Decisions</span>
            <span className="chip border border-accent-blue/40 bg-accent-blue/10 text-[10px] font-mono text-accent-blue">
              {hasRealData ? `${evaluationSummary!.total_tests} decisions` : "—"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Allowed / Blocked / Needs Your Approval from real runs</p>
        </div>
        <div className="h-48 w-full mt-2 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={decisionPieData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={65}
                paddingAngle={4}
                dataKey="value"
              >
                {decisionPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={24}
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-[10px] text-slate-300 font-medium">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 5: Per-stage Latency Breakdown */}
      <div className="surface-sunken flex flex-col justify-between p-4 rounded-xl border border-ink-600 hover-lift shadow-lg">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-white">Time Spent in Each Security Stage</span>
            <span className="chip border border-status-allow/40 bg-status-allow/10 text-[10px] font-mono text-status-allow">
              avg ms
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {hasRealData ? "Avg latency per security stage (real)" : "Awaiting real evaluation data"}
          </p>
        </div>
        <div className="h-48 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stagLatencyData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="latencyBarGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" stroke="#94A3B8" fontSize={10} tickLine={false} unit="ms" />
              <YAxis dataKey="stage" type="category" stroke="#94A3B8" fontSize={9} tickLine={false} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Latency" fill="url(#latencyBarGrad)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 6: Task Outcome by Test Type */}
      <div className="surface-sunken flex flex-col justify-between p-4 rounded-xl border border-ink-600 hover-lift shadow-lg">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-white">Task Results by Test Type</span>
            <span className="chip border border-status-allow/40 bg-status-allow/10 text-[10px] font-mono text-status-allow">
              {hasRealData ? `${evaluationSummary!.legitimate_tasks_completed_count} completed` : "—"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {hasRealData ? "Correct vs incorrect outcomes by category" : "Awaiting real evaluation data"}
          </p>
        </div>
        <div className="h-48 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="allowedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={1} />
                  <stop offset="100%" stopColor="#15803D" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="terminatedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                  <stop offset="100%" stopColor="#991B1B" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="tier" stroke="#94A3B8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Completed" fill="url(#allowedGrad)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Failed" fill="url(#terminatedGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
