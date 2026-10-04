"use client";

import React, { useState } from "react";
import PageShell from "@/components/secure-rag/PageShell";
import Reveal from "@/components/secure-rag/Reveal";
import { CheckIcon, XIcon } from "@/components/secure-rag/icons";
import { triggerConfetti, triggerThreatAlertEffect } from "@/lib/effects/confetti";

interface ApprovalItem {
  id: string;
  timestamp: string;
  proposedAction: string;
  tool: string;
  resource: string;
  recipient: string;
  reason: string;
}

const SEED_APPROVALS: ApprovalItem[] = [
  {
    id: "apr-001",
    timestamp: "2026-01-15T12:04:00.000Z",
    proposedAction: "Transmit confidential financial summary to external domain",
    tool: "email.send",
    resource: "user_report_q3.pdf",
    recipient: "analyst@external-vendor.com",
    reason:
      "Out-of-scope recipient destination. Target domain is not present on the authorized whitelist. Operator verification required.",
  },
  {
    id: "apr-002",
    timestamp: "2026-01-15T11:59:00.000Z",
    proposedAction: "Execute privilege escalation shell script to compress security logs",
    tool: "shell.exec",
    resource: "/var/log/secure-rag/*.log",
    recipient: "Local System (Operator Context)",
    reason:
      "Elevated shell execution requested. Resource target contains sensitive security telemetry. Requires human operator authorization.",
  },
  {
    id: "apr-003",
    timestamp: "2026-01-15T11:52:00.000Z",
    proposedAction: "Web search on external domain flagged for potential risk",
    tool: "web.search",
    resource: "https://attacker.example",
    recipient: "Internal Agent Engine",
    reason:
      "Target URL matches watchlist pattern. Verify search intent before allowing context retrieval.",
  },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>(SEED_APPROVALS);

  const handleApprove = (id: string) => {
    triggerConfetti({ particleCount: 65, spread: 80 });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleReject = (id: string) => {
    triggerThreatAlertEffect();
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <PageShell approvalsPending={items.length}>
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-12">
        <Reveal className="lg:col-span-12" delay={0}>
          <section className="card card-pad h-full flex flex-col justify-between">
            <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-ink-600 pb-4">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                    Human-in-the-Loop Approval Queue
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Review elevated tool execution requests intercepted by PromptWall Action Guard.
                  </p>
                </div>
                <span
                  className="chip border border-status-warn/50 bg-status-warn/15 text-status-warn font-bold px-3 py-1.5"
                  style={{ boxShadow: "var(--shadow-glow-yellow)" }}
                >
                  {items.length} Escalations Pending Review
                </span>
              </div>

              {items.length === 0 ? (
                <div className="surface-sunken flex flex-col items-center justify-center gap-3 p-12 text-center my-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-allow/15 text-status-allow border border-status-allow/30">
                    <CheckIcon size={28} />
                  </div>
                  <h3 className="text-base font-bold text-white">Queue Empty — All Items Processed</h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    No pending tool calls require human intervention. Protection pipeline is operating nominally.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <ApprovalCard
                      key={item.id}
                      item={item}
                      onApprove={() => handleApprove(item.id)}
                      onReject={() => handleReject(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </Reveal>
      </div>
    </PageShell>
  );
}

const ApprovalCard: React.FC<{
  item: ApprovalItem;
  onApprove: () => void;
  onReject: () => void;
}> = ({ item, onApprove, onReject }) => {
  return (
    <div
      className="hover-lift rounded-xl border border-status-warn/40 bg-ink-850 p-5 space-y-4"
      style={{ boxShadow: "var(--shadow-glow-yellow)" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-status-warn/50 bg-status-warn/15 text-status-warn shrink-0"
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-[15px] font-bold text-white">
              {item.proposedAction}
            </div>
            <div className="text-[11px] tabular-nums text-slate-400 mt-0.5">
              Queued at {fmtTime(item.timestamp)} · Event ID: {item.id}
            </div>
          </div>
        </div>
        <span className="chip border border-status-warn/40 bg-status-warn/10 text-[10px] font-bold uppercase tracking-wider text-status-warn">
          Awaiting Authorization
        </span>
      </div>

      {/* Detail grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Proposed Action Vector" value={item.proposedAction} />
        <Field label="Target Tool" value={item.tool} mono />
        <Field label="Resource Target" value={item.resource} mono />
        <Field label="Destination Recipient" value={item.recipient} mono />
        <div className="sm:col-span-2 lg:col-span-4">
          <Field label="Escalation Rationale" value={item.reason} block />
        </div>
      </div>

      {/* Action buttons with JS confetti effects */}
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          className="btn btn-success px-5"
          onClick={onApprove}
        >
          <CheckIcon size={16} />
          Authorize Action
        </button>
        <button
          type="button"
          className="btn btn-danger px-5"
          onClick={onReject}
        >
          <XIcon size={16} />
          Reject Action
        </button>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  block?: boolean;
}> = ({ label, value, mono, block }) => (
  <div className={`surface-sunken p-3 ${block ? "w-full" : ""}`}>
    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {label}
    </div>
    <div
      className={`text-[13px] leading-snug text-slate-100 ${
        mono ? "font-mono text-[12px]" : ""
      }`}
    >
      {value}
    </div>
  </div>
);

const AlertTriangle: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3l10 18H2L12 3z" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <circle cx="12" cy="17.5" r="0.6" fill="currentColor" />
  </svg>
);
