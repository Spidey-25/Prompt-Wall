"use client";

import React from "react";
import type { SecurityDecision } from "@/types";
import { CheckIcon, XIcon, AlertTriangleIcon, LockIcon } from "./icons";
import { triggerConfetti } from "@/lib/effects/confetti";

interface SecurityDecisionProps {
  decision: SecurityDecision | null;
  onApprove: () => void;
  onReject: () => void;
  resolving?: boolean;
}

const DECISION_META = {
  ALLOW: {
    label: "ALLOW — SAFE TASK",
    color: "#22C55E",
    ring: "border-status-allow/40",
    bg: "from-status-allow/15",
    icon: CheckIcon,
    summary: "Request cleared all firewall guardrails and is executing strictly within authorized scope.",
  },
  BLOCK: {
    label: "BLOCK — THREAT ISOLATED",
    color: "#EF4444",
    ring: "border-status-block/40",
    bg: "from-status-block/15",
    icon: XIcon,
    summary: "Adversarial prompt injection neutralized. Unauthorized action blocked — legitimate user task continued safely.",
  },
  ASK_HUMAN: {
    label: "HUMAN APPROVAL REQUIRED",
    color: "#F59E0B",
    ring: "border-status-warn/40",
    bg: "from-status-warn/15",
    icon: AlertTriangleIcon,
    summary: "Sensitive or elevated tool action proposed — human operator authorization required.",
  },
} as const;

const SecurityDecisionPanel: React.FC<SecurityDecisionProps> = ({
  decision,
  onApprove,
  onReject,
  resolving,
}) => {
  if (!decision) {
    return (
      <section className="card card-pad h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Security Verdict &amp; Decision Engine</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Engine Active
            </span>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <LockIcon size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-200">
                  Decision Engine Ready &amp; Listening
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Submit an agent task in the Playground to evaluate prompt firewall guardrails and enforcement verdicts.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="surface-sunken p-2 rounded-lg">
                <div className="text-[10px] uppercase font-bold text-slate-400">Content Firewall</div>
                <div className="font-semibold text-emerald-400 mt-0.5">ACTIVE</div>
              </div>
              <div className="surface-sunken p-2 rounded-lg">
                <div className="text-[10px] uppercase font-bold text-slate-400">Action Guard</div>
                <div className="font-semibold text-emerald-400 mt-0.5">ENFORCING</div>
              </div>
              <div className="surface-sunken p-2 rounded-lg">
                <div className="text-[10px] uppercase font-bold text-slate-400">Scope Extractor</div>
                <div className="font-semibold text-emerald-400 mt-0.5">BOUNDED</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const meta = DECISION_META[decision.type];
  const Icon = meta.icon;

  const handleApproveWithEffect = () => {
    triggerConfetti({ particleCount: 60, spread: 80 });
    onApprove();
  };

  return (
    <section className="card card-pad h-full flex flex-col justify-between">
      <div>
        <h2 className="section-title mb-4">Security Verdict &amp; Decision Engine</h2>

        <div className={`rounded-xl border ${meta.ring} bg-gradient-to-br ${meta.bg} to-transparent p-4 hover-lift`} style={{ boxShadow: "var(--shadow-3d-lg)" }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl border"
              style={{
                borderColor: meta.color,
                color: meta.color,
                background: `${meta.color}18`,
                boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.5), 0 4px 12px -2px ${meta.color}60`,
              }}
            >
              <Icon size={22} />
            </div>
            <div>
              <div
                className="text-lg font-extrabold tracking-wide"
                style={{ color: meta.color }}
              >
                {meta.label}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">{meta.summary}</div>
            </div>
          </div>

          {/* Allow details */}
          {decision.type === "ALLOW" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field
                label="Content Firewall Scan"
                value={decision.allow?.firewallScan || "PASSED — Zero Threat Signatures Matched"}
                accent="#22C55E"
              />
              <Field
                label="Scope Compliance"
                value={decision.allow?.scopeCompliance || "100% Authorized — Within Boundary"}
              />
              <Field
                label="Tool Execution Status"
                value={decision.allow?.toolExecutionStatus || "CLEARED FOR EXECUTION"}
              />
              <Field
                label="Legitimate Task Status"
                value={decision.allow?.legitimateTaskStatus || "EXECUTED SAFELY"}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Security Rationale"
                  value={decision.allow?.summary || "Request cleared all prompt firewall guardrails and is executing strictly within authorized scope."}
                  block
                />
              </div>
            </div>
          )}

          {/* Block details */}
          {decision.type === "BLOCK" && decision.block && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Threat Classification" value={decision.block.threatType} accent="#EF4444" />
              <Field label="Proposed Action Vector" value={decision.block.proposedTool} mono />
              {decision.block.risk && (
                <Field label="Security Risk Score" value={decision.block.risk} />
              )}
              {decision.block.policy && (
                <Field label="Violated Security Policy" value={decision.block.policy} mono />
              )}
              <div className="sm:col-span-2">
                <Field
                  label="Triggering Evidence (Injection Fragment)"
                  value={decision.block.triggeringContent}
                  mono
                  block
                  quote
                  italic
                />
              </div>
              {decision.block.evidence && (
                <Field label="Evidence Data Flow" value={decision.block.evidence} mono />
              )}
              <Field
                label="Threat Detection Layer"
                value={decision.block.detectionLayer || "Content Firewall"}
              />
              <Field
                label="Action Enforcement Layer"
                value={decision.block.enforcementLayer || "Action Guard"}
              />
              <Field
                label="Malicious Action Status"
                value={decision.block.maliciousActionStatus || "BLOCKED"}
              />
              <Field
                label="Tool Execution Status"
                value={decision.block.toolExecutionStatus || "NOT EXECUTED"}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Legitimate Task Status"
                  value={decision.block.legitimateTaskStatus || "COMPLETED — Task executed safely"}
                />
              </div>
              <div className="sm:col-span-2">
                <Field label="Security Rationale" value={decision.block.reason} block />
              </div>
              {decision.block.confidence !== undefined && decision.block.confidence > 0 && (
                <div className="sm:col-span-2 surface-sunken p-3.5">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Detection Confidence Level
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 w-full overflow-hidden rounded-full bg-ink-700">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${decision.block.confidence}%`,
                          background: "linear-gradient(90deg, #FF6A00, #FFC21A)",
                        }}
                      />
                    </div>
                    <span className="tabular-nums text-sm font-extrabold text-accent-blue">
                      {decision.block.confidence}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ask-human details */}
          {decision.type === "ASK_HUMAN" && decision.askHuman && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Proposed Action Vector" value={decision.askHuman.proposedAction} mono />
              <div className="sm:col-span-2">
                <Field label="Escalation Rationale" value={decision.askHuman.reason} block />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
                <button
                  className="btn btn-success px-5 text-sm"
                  onClick={handleApproveWithEffect}
                  disabled={resolving}
                >
                  <CheckIcon size={16} />
                  Authorize &amp; Proceed
                </button>
                <button
                  className="btn btn-danger px-5 text-sm"
                  onClick={onReject}
                  disabled={resolving}
                >
                  <XIcon size={16} />
                  Deny &amp; Terminate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  block?: boolean;
  quote?: boolean;
  italic?: boolean;
  accent?: string;
}> = ({ label, value, mono, block, quote, italic, accent }) => (
  <div
    className={`surface-sunken p-3 ${block ? "w-full" : ""}`}
  >
    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {label}
    </div>
    <div
      className={`text-sm leading-snug text-slate-100 ${mono ? "font-mono text-[12.5px]" : ""} ${
        italic ? "italic text-slate-300" : ""
      } ${quote ? "border-l-2 pl-2" : ""}`}
      style={quote && accent ? { borderColor: accent } : quote ? { borderColor: "#FF6A00" } : undefined}
    >
      {value}
    </div>
  </div>
);

export default SecurityDecisionPanel;
