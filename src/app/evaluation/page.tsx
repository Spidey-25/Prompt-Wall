"use client";

import { useCallback, useEffect, useState } from "react";
import PageShell from "@/components/secure-rag/PageShell";
import Reveal from "@/components/secure-rag/Reveal";
import EvaluationPipelineGraph from "@/components/secure-rag/EvaluationPipelineGraph";
import {
  fetchLatestEvaluation,
  triggerEvaluationRun,
  type EvaluationRunSummary,
} from "@/lib/api/backendClient";
import { loadWorkspace, subscribeWorkspace } from "@/lib/workspace";

export default function EvaluationPage() {
  const [summary, setSummary] = useState<EvaluationRunSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [pipeline, setPipeline] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetchLatestEvaluation().then(setSummary).catch(() => undefined);
    loadWorkspace().then((workspace) => setPipeline(workspace.pipeline)).catch(() => undefined);
    return subscribeWorkspace((workspace) => setPipeline(workspace.pipeline));
  }, []);

  const runEvaluation = useCallback(async () => {
    setRunning(true);
    setError("");
    try {
      const next = await triggerEvaluationRun();
      setSummary(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed.");
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <PageShell>
      <Reveal className="w-full" delay={0}>
        <section className="card card-pad">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                LangGraph Security Testing
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                One live graph of the measured security pipeline stages.
              </p>
            </div>
            <button
              onClick={runEvaluation}
              disabled={running}
              className="btn btn-primary"
            >
              {running ? "Testing..." : "Run Security Test"}
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-status-block">{error}</p>}
        </section>
      </Reveal>

      <Reveal className="mt-5 w-full" delay={60}>
        <section className="card card-pad">
          <h2 className="section-title mb-4">LangGraph Execution Graph</h2>
          <EvaluationPipelineGraph summary={summary} pipeline={pipeline} />
          {summary && (
            <p className="mt-4 text-xs text-slate-500">
              Run {summary.evaluation_run_id}: {summary.passed_tests}/{summary.total_tests} tests passed.
              Average latency: {summary.average_latency_ms.toFixed(0)}ms.
            </p>
          )}
        </section>
      </Reveal>
    </PageShell>
  );
}
