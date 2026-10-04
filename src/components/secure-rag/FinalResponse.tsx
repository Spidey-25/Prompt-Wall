"use client";

import React, { useEffect } from "react";
import type { FinalResponse } from "@/types";
import { DocIcon, CheckIcon } from "./icons";
import { triggerConfetti } from "@/lib/effects/confetti";

interface FinalResponsePanelProps {
  response: FinalResponse | null;
  onRunAgain?: () => void;
}

const FinalResponsePanel: React.FC<FinalResponsePanelProps> = ({
  response,
  onRunAgain,
}) => {
  const empty = !response || !response.ready;

  useEffect(() => {
    if (response?.ready) {
      triggerConfetti({ particleCount: 50, spread: 70 });
    }
  }, [response?.ready]);

  return (
    <section className="card card-pad h-full flex flex-col justify-between">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Final Agent Output &amp; Sanitized Response</h2>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            {empty ? "Awaiting Pipeline" : "Delivered"}
          </span>
        </div>

        {empty ? (
          <div className="surface-sunken flex items-center gap-3 p-4 text-sm text-slate-400">
            <DocIcon size={18} />
            <span>
              The AI agent&apos;s sanitized response and task output will appear here once the security pipeline finishes processing.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status banner */}
            <div
              className="hover-lift rounded-xl border border-status-allow/30 bg-status-allow/[0.08] p-4"
              style={{ boxShadow: "var(--shadow-glow-green)" }}
            >
              <div className="flex items-center gap-2">
                <CheckIcon size={18} className="text-status-allow" />
                <span className="text-sm font-bold uppercase tracking-wider text-status-allow">
                  Task Execution Completed Safely
                </span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-100 font-medium">
                {response!.text}
              </p>
            </div>

            {/* Vendor comparison */}
            {response!.vendors && response!.vendors.length > 0 && (
              <div className="surface-sunken p-4">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Extracted Vendor Comparison Matrix
                </div>
                <div className="space-y-2">
                  {response!.vendors.map((v) => (
                    <div
                      key={v.name}
                      className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 ${
                        v.isLowest
                          ? "border-status-allow/50 bg-status-allow/15"
                          : "border-ink-600 bg-ink-900"
                      }`}
                    >
                      <span className="text-[13px] font-semibold text-slate-100">
                        {v.name}
                        {v.isLowest && (
                          <span className="ml-2 rounded bg-status-allow px-1.5 py-0.5 text-[10px] font-extrabold text-black">
                            LOWEST QUOTE
                          </span>
                        )}
                      </span>
                      <span
                        className={`tabular-nums font-mono text-[13px] ${
                          v.isLowest ? "text-status-allow font-bold" : "text-slate-400"
                        }`}
                      >
                        {v.price}
                      </span>
                    </div>
                  ))}
                </div>
                {response!.result && (
                  <div className="mt-3 text-[13px] text-slate-200 border-t border-ink-600 pt-2.5">
                    <span className="text-slate-400 font-bold">Conclusion: </span>
                    {response!.result}
                  </div>
                )}
              </div>
            )}

            {/* Security summary */}
            {response!.securitySummary && response!.securitySummary.length > 0 && (
              <div className="surface-sunken p-4">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Security Pipeline Compliance Summary
                </div>
                <ul className="space-y-2">
                  {response!.securitySummary.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px] text-slate-200">
                      <CheckIcon size={14} className="text-status-allow shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <a
                href="/audit-logs"
                className="btn-ghost btn border border-ink-600 bg-ink-800 text-slate-200 hover:text-white"
              >
                View Audit Telemetry
              </a>
              {onRunAgain && (
                <button
                  type="button"
                  onClick={onRunAgain}
                  className="btn btn-primary"
                >
                  Run Another Task
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FinalResponsePanel;
