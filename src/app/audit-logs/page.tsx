"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { AuditStatus } from "@/types";
import PageShell from "@/components/secure-rag/PageShell";
import Reveal from "@/components/secure-rag/Reveal";
import {
  getAuditEvents,
  subscribeAuditEvents,
  type RealAuditEvent,
} from "@/lib/auditEventStore";

type TableRow = RealAuditEvent;

const DECISION_COLOR: Record<string, string> = {
  ALLOW: "#22C55E",
  BLOCK: "#EF4444",
  "ASK HUMAN": "#F59E0B",
};

const STATUS_COLOR: Record<AuditStatus, string> = {
  info: "#FF6A00",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${date} · ${time}`;
}

const COLUMNS: { key: string; label: string; className?: string }[] = [
  { key: "timestamp", label: "Timestamp", className: "w-[180px]" },
  { key: "event", label: "Security Event", className: "w-[190px]" },
  { key: "decision", label: "Verdict", className: "w-[120px]" },
  { key: "evidence", label: "Evidence & Context" },
  { key: "rule", label: "Security Rule", className: "w-[220px]" },
  { key: "tool", label: "Target Tool", className: "w-[120px]" },
  { key: "status", label: "Status", className: "w-[110px] text-right" },
];

export default function AuditLogsPage() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);

  // Load initial events and subscribe to live updates
  useEffect(() => {
    setRows(getAuditEvents());
    const unsub = subscribeAuditEvents((updated) => {
      setRows(updated);
    });
    return unsub;
  }, []);

  const filtered = rows.filter((r) => {
    const matchesSearch =
      !search ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.eventType.toLowerCase().includes(search.toLowerCase()) ||
      r.tool.toLowerCase().includes(search.toLowerCase()) ||
      r.rule.toLowerCase().includes(search.toLowerCase()) ||
      r.evidence.toLowerCase().includes(search.toLowerCase());
    const matchesDecision =
      decisionFilter === "all" || r.decision === decisionFilter;
    const matchesRisk =
      riskFilter === "all" ||
      (riskFilter === "danger" && r.status === "danger") ||
      (riskFilter === "warning" && r.status === "warning") ||
      (riskFilter === "success" && r.status === "success") ||
      (riskFilter === "info" && r.status === "info");
    return matchesSearch && matchesDecision && matchesRisk;
  });

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filtered, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `promptwall-audit-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <PageShell>
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-12">
        <Reveal className="lg:col-span-12" delay={0}>
          <section className="card h-full overflow-hidden flex flex-col justify-between">
            {/* Header & Tagline */}
            <div className="flex flex-col gap-3 border-b border-ink-600 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                    Security Audit Log Telemetry
                  </h1>
                  <span className="chip border border-accent-blue/40 bg-accent-blue/10 text-accent-blue text-[10px] font-extrabold uppercase tracking-widest">
                    Think Safe. Act Safe.
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Immutable security record of prompt injection scans, content firewall verdicts, and action guard execution logs.
                </p>
              </div>

              {/* Action Buttons & Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={exportJSON}
                  className="btn btn-ghost text-xs px-3.5 py-1.5 font-bold"
                >
                  📥 Export JSON
                </button>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search logs, tools, policies…"
                  className="input-base w-44 rounded-lg py-1.5 text-[12.5px] md:w-56"
                />
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="input-base w-32 rounded-lg py-1.5 text-[12px] font-semibold"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="danger">High Danger</option>
                  <option value="warning">Medium Warning</option>
                  <option value="info">Info Log</option>
                  <option value="success">Success</option>
                </select>
                <select
                  value={decisionFilter}
                  onChange={(e) => setDecisionFilter(e.target.value)}
                  className="input-base w-32 rounded-lg py-1.5 text-[12px] font-semibold"
                >
                  <option value="all">All Verdicts</option>
                  <option value="ALLOW">ALLOW</option>
                  <option value="BLOCK">BLOCK</option>
                  <option value="ASK HUMAN">ASK HUMAN</option>
                </select>
              </div>
            </div>

            {/* Audit Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-600 bg-ink-850/50">
                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        className={`px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${c.className ?? ""}`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-600">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                        {rows.length === 0
                          ? "No audit events yet. Run an execution in the Playground to generate real security events."
                          : "No audit events matching the selected filter criteria."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const dColor = DECISION_COLOR[row.decision] ?? "#A1A1A1";
                      const sColor = STATUS_COLOR[row.status];
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedRow(row)}
                          className="transition-colors hover:bg-ink-800/60 cursor-pointer"
                        >
                          <td className="px-6 py-3.5 font-mono text-[12px] tabular-nums text-slate-300">
                            {fmtTime(row.timestamp)}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className="inline-flex items-center gap-1.5 rounded border border-ink-600 bg-ink-850 px-2.5 py-1 font-mono text-[10.5px] font-bold"
                              style={{ color: sColor }}
                            >
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ background: sColor, boxShadow: `0 0 6px ${sColor}` }}
                              />
                              {row.eventType}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className="font-mono text-[11px] font-extrabold uppercase tracking-wider"
                              style={{ color: dColor }}
                            >
                              {row.decision}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-[13px] text-slate-200">
                            {row.evidence}
                          </td>
                          <td className="px-6 py-3.5 font-mono text-[12px] text-slate-400">
                            {row.rule}
                          </td>
                          <td className="px-6 py-3.5 font-mono text-[12px] text-slate-300">
                            {row.tool}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <span
                              className="inline-flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                              style={{ color: sColor }}
                            >
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ background: sColor }}
                              />
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-ink-600 px-6 py-3 text-xs text-slate-400">
              <span>Showing {filtered.length} of {rows.length} security audit entries</span>
              <span className="font-mono text-[11px]">Real-Time Security Event Pipeline Active</span>
            </div>
          </section>
        </Reveal>
      </div>

      {/* Audit Detail Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="card max-w-2xl w-full p-6 border-accent-blue/50 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-600 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ background: STATUS_COLOR[selectedRow.status] }}
                />
                <h3 className="text-lg font-bold text-white">
                  Audit Log Deep Inspection · {selectedRow.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="surface-sunken p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Event ID
                </span>
                <span className="font-mono text-white font-bold">{selectedRow.id}</span>
              </div>
              <div className="surface-sunken p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Security Verdict
                </span>
                <span
                  className="font-mono font-extrabold uppercase text-sm"
                  style={{ color: DECISION_COLOR[selectedRow.decision] ?? "#FFF" }}
                >
                  {selectedRow.decision}
                </span>
              </div>
              <div className="surface-sunken p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Risk Score
                </span>
                <span className="font-mono font-bold text-accent-blue text-sm">
                  {selectedRow.riskScore ?? 15} / 100
                </span>
              </div>
              <div className="surface-sunken p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Evaluated Rule
                </span>
                <span className="font-mono text-slate-200">{selectedRow.rule}</span>
              </div>
              <div className="surface-sunken p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Target Tool
                </span>
                <span className="font-mono text-slate-200">{selectedRow.tool}</span>
              </div>
              <div className="surface-sunken p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Client Node IP
                </span>
                <span className="font-mono text-slate-200">{selectedRow.ipAddress}</span>
              </div>
            </div>

            <div className="surface-sunken p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Evidence & Context Trace
              </span>
              <p className="text-sm font-semibold text-slate-100">{selectedRow.evidence}</p>
              <p className="text-xs text-slate-400 mt-1">{selectedRow.description}</p>
            </div>

            <div className="surface-sunken p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Raw Log Payload (JSON)
              </span>
              <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto p-2 bg-ink-950 rounded max-h-40">
{JSON.stringify(
  {
    id: selectedRow.id,
    timestamp: selectedRow.timestamp,
    event_type: selectedRow.eventType,
    verdict: selectedRow.decision,
    rule: selectedRow.rule,
    tool: selectedRow.tool,
    evidence: selectedRow.evidence,
    ip: selectedRow.ipAddress,
    execution_id: selectedRow.executionId,
    policy_status: "ENFORCED",
  },
  null,
  2
)}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-primary text-xs px-5 py-2"
                onClick={() => setSelectedRow(null)}
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
