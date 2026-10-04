"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/secure-rag/PageShell";
import Reveal from "@/components/secure-rag/Reveal";
import { predictMlInput, type MlResult } from "@/lib/api/backendClient";
import { loadWorkspace, subscribeWorkspace } from "@/lib/workspace";

export default function SecurityTestingPage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<MlResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const evaluate = (value: string) => {
      setPrompt(value);
      if (!value.trim()) {
        setResult(null);
        return;
      }
      predictMlInput(value)
        .then((next) => {
          if (!active) return;
          setResult(next);
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Security model unavailable.");
        });
    };

    loadWorkspace().then((workspace) => evaluate(workspace.prompt)).catch(() => undefined);
    const unsubscribe = subscribeWorkspace((workspace) => evaluate(workspace.prompt));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <PageShell>
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-12">
        <Reveal className="lg:col-span-12" delay={0}>
          <section className="card card-pad">
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Security Testing
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              The local ML security classifier evaluates the shared Agent Task Input automatically.
              It is integrated into the workflow and does not provide a separate input form.
            </p>
          </section>
        </Reveal>

        <Reveal className="lg:col-span-7" delay={60}>
          <section className="card card-pad">
            <h2 className="section-title">Approved Agent Task</h2>
            <p className="mt-3 rounded-xl border border-ink-600 bg-ink-850 p-4 font-mono text-sm text-slate-300">
              {prompt || "No task has been submitted yet."}
            </p>
            {error && <p className="mt-3 text-sm text-status-block">{error}</p>}
          </section>
        </Reveal>

        <Reveal className="lg:col-span-5" delay={100}>
          <section className="card card-pad h-full">
            <h2 className="section-title">Integrated Model Result</h2>
            {!result ? (
              <p className="mt-4 text-sm text-slate-500">Awaiting a shared task.</p>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <div className="surface-sunken rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-500">Status</div>
                  <div className="mt-1 font-bold text-white">{result.status}</div>
                </div>
                <div className="surface-sunken rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-500">Prediction</div>
                  <div className="mt-1 font-bold text-white">{result.prediction ?? "Not available"}</div>
                </div>
                <div className="surface-sunken rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-500">Training samples</div>
                  <div className="mt-1 font-mono text-white">{result.training_samples}</div>
                </div>
              </div>
            )}
          </section>
        </Reveal>
      </div>
    </PageShell>
  );
}
