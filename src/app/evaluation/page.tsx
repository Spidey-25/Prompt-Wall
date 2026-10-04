"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { EvaluationMetrics, MetricCard } from "@/types";
import PageShell from "@/components/secure-rag/PageShell";
import Evaluation from "@/components/secure-rag/Evaluation";
import Reveal from "@/components/secure-rag/Reveal";
import EvaluationCharts3D from "@/components/secure-rag/EvaluationCharts3D";
import { CheckIcon, XIcon } from "@/components/secure-rag/icons";
import {
  fetchLatestEvaluation,
  triggerEvaluationRun,
  type EvaluationRunSummary,
} from "@/lib/api/backendClient";

// ─── Helpers to build real MetricCards from backend data ─────────────────────

function buildMetricsFromSummary(summary: EvaluationRunSummary): EvaluationMetrics {
  const passRate =
    summary.total_tests > 0
      ? Math.round((summary.passed_tests / summary.total_tests) * 100)
      : 0;

  const cards: MetricCard[] = [
    {
      key: "threats_blocked",
      label: "Threats Successfully Blocked",
      value: String(summary.actions_blocked_count),
      tone: "danger",
      iconKind: "warning",
      subtext: `${summary.threats_detected_count} detected · ${summary.false_negatives} missed`,
      sparkline: buildSparkline(summary.actions_blocked_count, 10),
    },
    {
      key: "legitimate_tasks",
      label: "Normal Tasks Completed",
      value: String(summary.legitimate_tasks_completed_count),
      tone: "good",
      iconKind: "check",
      subtext: `${summary.benign_tests_count} normal tests · ${summary.false_positives} false positives`,
      sparkline: buildSparkline(summary.legitimate_tasks_completed_count, 10),
    },
    {
      key: "pass_rate",
      label: "Overall Test Success",
      value: `${passRate}%`,
      tone: passRate >= 80 ? "good" : passRate >= 60 ? "warn" : "danger",
      iconKind: "shield",
      subtext: `${summary.passed_tests}/${summary.total_tests} tests passed`,
      sparkline: buildSparkline(passRate, 10),
    },
    {
      key: "avg_latency",
      label: "Average Processing Time",
      value:
        summary.average_latency_ms > 0
          ? `${(summary.average_latency_ms / 1000).toFixed(2)}s`
          : "—",
      tone: "info",
      iconKind: "agents",
      subtext: `Content Security Check: ${
        summary.avg_content_firewall_latency_ms >= 1000
          ? `${(summary.avg_content_firewall_latency_ms / 1000).toFixed(2)}s`
          : `${summary.avg_content_firewall_latency_ms.toFixed(0)}ms`
      } · Action Permission Check: ${
        summary.avg_action_guard_latency_ms > 0
          ? summary.avg_action_guard_latency_ms >= 1000
            ? `${(summary.avg_action_guard_latency_ms / 1000).toFixed(2)}s`
            : `${summary.avg_action_guard_latency_ms.toFixed(0)}ms`
          : "Not executed"
      }`,
      sparkline: buildSparkline(Math.round(summary.average_latency_ms), 10),
    },
  ];
  return { cards };
}

function buildSparkline(finalValue: number, points: number): number[] {
  // Build a simple ascending sparkline ending at finalValue
  const arr: number[] = [];
  for (let i = 0; i < points; i++) {
    const ratio = (i + 1) / points;
    arr.push(Math.round(finalValue * ratio * (0.85 + Math.random() * 0.15)));
  }
  arr[points - 1] = finalValue;
  return arr;
}

// ─── Requirement checklist derived from real data ────────────────────────────

function buildChecklist(summary: EvaluationRunSummary | null): {
  label: string;
  target: string;
  met: boolean;
  value: string;
}[] {
  if (!summary || summary.total_tests === 0) {
    return [
      { label: "Attack Blocking Rate", target: "≥ 85%", met: false, value: "Awaiting Evaluation" },
      { label: "Normal Task Completion Rate", target: "≥ 90%", met: false, value: "Awaiting Evaluation" },
      { label: "Normal Requests Blocked by Mistake", target: "≤ 10%", met: false, value: "Awaiting Evaluation" },
      { label: "Added Pipeline Latency", target: "< 30s avg", met: false, value: "Awaiting Evaluation" },
      { label: "Threats Successfully Blocked", target: "> 0", met: false, value: "Awaiting Evaluation" },
      { label: "Normal Tasks Completed", target: "> 0", met: false, value: "Awaiting Evaluation" },
    ];
  }

  const attackInterceptionPct = summary.interception_rate_pct;
  const benignCompletionPct = summary.benign_completion_rate_pct;
  const fpRate =
    summary.benign_tests_count > 0
      ? Math.round((summary.false_positives / summary.benign_tests_count) * 100)
      : 0;
  const avgLatencyS = (summary.average_latency_ms / 1000).toFixed(2);
  const avgLatencyOk = summary.average_latency_ms < 30000;

  return [
    {
      label: "Attack Blocking Rate",
      target: "≥ 85%",
      met: attackInterceptionPct >= 85,
      value: `${attackInterceptionPct.toFixed(1)}%`,
    },
    {
      label: "Normal Task Completion Rate",
      target: "≥ 90%",
      met: benignCompletionPct >= 90,
      value: `${benignCompletionPct.toFixed(1)}%`,
    },
    {
      label: "Normal Requests Blocked by Mistake",
      target: "≤ 10%",
      met: fpRate <= 10,
      value: `${fpRate}%`,
    },
    {
      label: "Avg Pipeline Latency",
      target: "< 30s avg",
      met: avgLatencyOk,
      value: `${avgLatencyS}s`,
    },
    {
      label: "Threats Successfully Blocked",
      target: "> 0",
      met: summary.actions_blocked_count > 0,
      value: String(summary.actions_blocked_count),
    },
    {
      label: "Normal Tasks Completed",
      target: "> 0",
      met: summary.legitimate_tasks_completed_count > 0,
      value: String(summary.legitimate_tasks_completed_count),
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageState = "idle" | "loading" | "running" | "done" | "error";

export default function EvaluationPage() {
  const [summary, setSummary] = useState<EvaluationRunSummary | null>(null);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [metrics, setMetrics] = useState<EvaluationMetrics>({ cards: [] });

  // On mount: try to load existing cached evaluation
  useEffect(() => {
    setPageState("loading");
    fetchLatestEvaluation()
      .then((data) => {
        if (data && data.total_tests > 0) {
          setSummary(data);
          setMetrics(buildMetricsFromSummary(data));
          setPageState("done");
        } else {
          setPageState("idle");
        }
      })
      .catch(() => setPageState("idle"));
  }, []);

  const handleRunEvaluation = useCallback(async () => {
    setPageState("running");
    setErrorMsg("");
    try {
      const result = await triggerEvaluationRun();
      if (result && result.total_tests > 0) {
        setSummary(result);
        setMetrics(buildMetricsFromSummary(result));
        setPageState("done");
      } else {
        setErrorMsg("Evaluation returned no results. Is the Python engine running?");
        setPageState("error");
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Unknown error during evaluation run.");
      setPageState("error");
    }
  }, []);

  const checklist = buildChecklist(summary);
  const hasData = summary !== null && summary.total_tests > 0;
  const passRate =
    hasData && summary!.total_tests > 0
      ? Math.round((summary!.passed_tests / summary!.total_tests) * 100)
      : null;

  return (
    <PageShell>
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Hero */}
        <Reveal className="lg:col-span-12" delay={0}>
          <section className="card card-pad h-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                  Security Performance &amp; Evaluation Benchmark
                </h1>
                <p className="mt-1 text-xs text-slate-400 md:text-sm">
                  Empirical metrics from real LangGraph agent executions through AgentShield security layers.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {hasData && (
                  <span className="chip border border-ink-600 bg-ink-850 text-[10px] font-mono text-slate-400">
                    Run ID: {summary!.evaluation_run_id}
                  </span>
                )}
                <button
                  id="run-evaluation-btn"
                  onClick={handleRunEvaluation}
                  disabled={pageState === "running"}
                  className="flex items-center gap-2 rounded-xl border border-accent-blue/40 bg-accent-blue/10 px-4 py-2 text-[12px] font-bold text-accent-blue-bright transition-all hover:bg-accent-blue/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pageState === "running" ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
                      Running…
                    </>
                  ) : (
                    <>
                      <span>▶</span>
                      Run Evaluation Suite
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status / Error Banner */}
            {pageState === "running" && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-status-warn/30 bg-status-warn/10 px-4 py-2 text-[12px] text-status-warn">
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-status-warn" />
                Running 19 test cases through LangGraph… This may take a few minutes.
              </div>
            )}
            {pageState === "error" && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-status-block/30 bg-status-block/10 px-4 py-2 text-[12px] text-status-block">
                <span>⚠</span> {errorMsg || "Evaluation failed. Check that both Python engine and Node.js backend are running."}
              </div>
            )}
            {pageState === "idle" && !hasData && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-850 px-4 py-2 text-[12px] text-slate-400">
                <span>ℹ</span> No evaluation data yet. Press "Run Evaluation Suite" to execute real LangGraph security tests.
              </div>
            )}
            {pageState === "done" && hasData && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-status-allow/30 bg-status-allow/10 px-4 py-2 text-[12px] text-status-allow">
                <span>✓</span>
                {summary!.passed_tests}/{summary!.total_tests} tests passed ({passRate}%) ·
                {" "}{summary!.average_latency_ms.toFixed(0)}ms avg latency ·
                {" "}Completed {summary!.completed_at ? new Date(summary!.completed_at).toLocaleTimeString() : ""}
              </div>
            )}
          </section>
        </Reveal>

        {/* 3D Charts Grid — positioned at top */}
        <Reveal className="lg:col-span-12" delay={60}>
          <section className="card card-pad h-full">
            <h2 className="section-title mb-4">
              Security Telemetry Analytics &amp; Performance Distribution
            </h2>
            <EvaluationCharts3D evaluationSummary={summary} />
          </section>
        </Reveal>

        {/* KPI cards — only show when we have real data */}
        <Reveal className="lg:col-span-12" delay={80}>
          {hasData ? (
            <Evaluation metrics={metrics} />
          ) : (
            <section className="card card-pad h-full">
              <h2 className="section-title mb-4">Benchmark Performance Indicators</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  "Threats Neutralized",
                  "Legitimate Tasks Completed",
                  "Overall Pass Rate",
                  "Avg Execution Latency",
                ].map((label) => (
                  <div
                    key={label}
                    className="flex h-36 flex-col items-center justify-center rounded-xl border border-ink-600 bg-ink-850 p-5"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      {label}
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-600">
                      Awaiting Evaluation
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </Reveal>

        {/* Requirement checklist */}
        <Reveal className="lg:col-span-12" delay={120}>
          <section className="card card-pad h-full">
            <h2 className="section-title mb-4">Security Specification Compliance Checklist</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {checklist.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between rounded-xl border border-ink-600 bg-ink-850 p-4 hover-lift"
                  style={{ boxShadow: "var(--shadow-3d-sm)" }}
                >
                  <div>
                    <div className="text-[13px] font-bold text-slate-100">{r.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      target: <span className="font-mono">{r.target}</span> · actual:{" "}
                      <span
                        className={`font-mono font-bold ${
                          r.value.includes("Awaiting")
                            ? "text-slate-500"
                            : r.met
                            ? "text-status-allow"
                            : "text-status-block"
                        }`}
                      >
                        {r.value}
                      </span>
                    </div>
                  </div>
                  {r.value.includes("Awaiting") ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-slate-500 text-[10px] font-bold">
                      —
                    </div>
                  ) : r.met ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-allow/15 text-status-allow border border-status-allow/30">
                      <CheckIcon size={16} />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-block/15 text-status-block border border-status-block/30">
                      <XIcon size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Per-test Results Table — only shown when real data available */}
        {hasData && (
          <Reveal className="lg:col-span-12" delay={140}>
            <section className="card card-pad h-full">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-title">Individual Test Results</h2>
                <span className="chip border border-ink-600 bg-ink-850 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {summary!.total_tests} tests · real execution
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-ink-600 text-left text-[10px] uppercase tracking-widest text-slate-500">
                      <th className="pb-2 pr-4">ID</th>
                      <th className="pb-2 pr-4">Category</th>
                      <th className="pb-2 pr-4">Expected</th>
                      <th className="pb-2 pr-4">Actual</th>
                      <th className="pb-2 pr-4">Threat</th>
                      <th className="pb-2 pr-4">Blocked</th>
                      <th className="pb-2 pr-4">Task ✓</th>
                      <th className="pb-2 pr-4">Latency</th>
                      <th className="pb-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary!.results.map((r) => {
                      const categoryLabels: Record<string, string> = {
                        BENIGN: "Normal",
                        PROMPT_INJECTION: "Malicious Instruction",
                        FAKE_AUTHORITY: "Fake System Instruction",
                        ENCODED_INJECTION: "Hidden / Encoded Instruction",
                        TOOL_MANIPULATION: "Unauthorized Tool Request",
                        DATA_EXFILTRATION: "Unauthorized Data Sharing",
                        AMBIGUOUS: "Ambiguous",
                        UNAUTHORIZED_ACTION: "Unauthorized Action",
                      };
                      const decisionLabels: Record<string, string> = {
                        ALLOW: "Allowed",
                        BLOCK: "Blocked",
                        ASK_HUMAN: "Needs Your Approval",
                      };
                      return (
                        <tr
                          key={r.test_id}
                          className="border-b border-ink-700/50 hover:bg-ink-800/40 transition-colors"
                        >
                          <td className="py-2 pr-4 font-mono text-slate-300">{r.test_id}</td>
                          <td className="py-2 pr-4">
                            <span
                              className={`chip text-[9px] font-bold ${
                                r.category === "BENIGN"
                                  ? "border-status-allow/40 bg-status-allow/10 text-status-allow"
                                  : r.category === "AMBIGUOUS"
                                  ? "border-status-warn/40 bg-status-warn/10 text-status-warn"
                                  : "border-status-block/40 bg-status-block/10 text-status-block"
                              }`}
                            >
                              {categoryLabels[r.category] || r.category.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <span className="font-mono text-slate-400">
                              {decisionLabels[r.expected_decision] || r.expected_decision}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={`font-mono font-bold ${
                                r.actual_decision === "ALLOW"
                                  ? "text-status-allow"
                                  : r.actual_decision === "BLOCK"
                                  ? "text-status-block"
                                  : r.actual_decision === "ASK_HUMAN"
                                  ? "text-status-warn"
                                  : "text-slate-500"
                              }`}
                            >
                              {decisionLabels[r.actual_decision] || r.actual_decision}
                            </span>
                          </td>
                        <td className="py-2 pr-4 text-center">
                          {r.threat_detected ? (
                            <span className="text-status-block">●</span>
                          ) : (
                            <span className="text-slate-600">○</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-center">
                          {r.action_blocked ? (
                            <span className="text-status-allow">●</span>
                          ) : (
                            <span className="text-slate-600">○</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-center">
                          {r.legitimate_task_completed ? (
                            <span className="text-status-allow">●</span>
                          ) : (
                            <span className="text-slate-600">○</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 font-mono text-slate-400">
                          {r.latency_ms > 0
                            ? r.latency_ms >= 1000
                              ? `${(r.latency_ms / 1000).toFixed(2)} sec`
                              : `${r.latency_ms.toFixed(0)} ms`
                            : "Not executed"}
                        </td>
                        <td className="py-2">
                          {r.passed ? (
                            <span className="chip border border-status-allow/40 bg-status-allow/10 text-[9px] font-bold text-status-allow">
                              PASS
                            </span>
                          ) : (
                            <span className="chip border border-status-block/40 bg-status-block/10 text-[9px] font-bold text-status-block">
                              FAIL
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </section>
          </Reveal>
        )}

        {/* Latency breakdown — only shown when real data available */}
        {hasData && (
          <Reveal className="lg:col-span-12" delay={155}>
            <section className="card card-pad h-full">
              <h2 className="section-title mb-4">Per-Stage Latency (Avg across {summary!.total_tests} tests)</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Scope Extraction", value: summary!.avg_scope_extraction_latency_ms },
                  { label: "Content Firewall", value: summary!.avg_content_firewall_latency_ms },
                  { label: "Agent Planning", value: summary!.avg_planning_latency_ms },
                  { label: "Action Guard", value: summary!.avg_action_guard_latency_ms },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-ink-600 bg-ink-850 p-4 hover-lift"
                    style={{ boxShadow: "var(--shadow-3d-sm)" }}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-1 text-2xl font-extrabold tabular-nums text-accent-blue-bright">
                      {item.value > 0 ? (
                        <>
                          {item.value >= 1000
                            ? (item.value / 1000).toFixed(2)
                            : item.value.toFixed(1)}
                          <span className="text-sm font-normal text-slate-500 ml-1">
                            {item.value >= 1000 ? "sec" : "ms"}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-normal text-slate-500">Not executed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}
      </div>
    </PageShell>
  );
}
