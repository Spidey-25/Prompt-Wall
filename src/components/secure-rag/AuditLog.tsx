"use client";

import React, { useMemo, useState } from "react";
import type { AuditEvent, AuditStatus } from "@/types";
import { ClockIcon, CheckIcon, AlertTriangleIcon, XIcon } from "./icons";

interface AuditLogProps {
  events: AuditEvent[];
}

const STATUS_DOT: Record<AuditStatus, string> = {
  info: "#FF6A00",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const STATUS_TEXT: Record<AuditStatus, string> = {
  info: "text-accent-blue",
  success: "text-status-allow",
  warning: "text-status-warn",
  danger: "text-status-block",
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
    timeZone: "UTC",
  });
}

const AuditLog: React.FC<AuditLogProps> = ({ events }) => {
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const sorted = useMemo(
    () =>
      [...events]
        .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
        .filter((ev) => filter === "all" || ev.status === filter),
    [events, filter]
  );

  return (
    <section className="card card-pad h-full flex flex-col justify-between">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="section-title">Live Security Audit Log</h2>
            <span className="chip border border-ink-600 bg-ink-850 text-[10px] font-mono text-slate-400">
              {events.length} Events
            </span>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex items-center gap-1">
            {["all", "danger", "warning", "success"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-colors ${
                  filter === f
                    ? "bg-accent-blue text-black"
                    : "bg-ink-850 text-slate-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="surface-sunken flex items-center gap-2 p-4 text-xs text-slate-400">
            <ClockIcon size={16} />
            No audit events matching current filter. Logs appear in real time.
          </div>
        ) : (
          <ol className="relative max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {sorted.map((ev) => (
              <li
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className="hover-lift flex items-start gap-3 rounded-xl border border-ink-600 bg-ink-850 px-3.5 py-3 animate-fade-in-up cursor-pointer hover:border-accent-blue/40"
                style={{ boxShadow: "var(--shadow-3d-sm)" }}
              >
                <span
                  className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: STATUS_DOT[ev.status],
                    boxShadow: `0 0 10px ${STATUS_DOT[ev.status]}`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tabular-nums font-mono text-[11px] text-slate-400">
                      {fmtTime(ev.timestamp)} · ID: {ev.id}
                    </span>
                    <span
                      className={`chip border border-ink-600 bg-ink-900 px-2 py-0.5 font-mono text-[10px] font-bold ${STATUS_TEXT[ev.status]}`}
                      style={{ boxShadow: "var(--shadow-3d-sm)" }}
                    >
                      {ev.eventType}
                    </span>
                  </div>
                  <div className="mt-1 text-[13px] font-medium leading-snug text-slate-200">
                    {ev.description}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Selected Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="card max-w-xl w-full p-6 border-accent-blue/50 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-600 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: STATUS_DOT[selectedEvent.status] }}
                />
                <h3 className="text-base font-bold text-white">
                  Audit Log Telemetry Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="surface-sunken p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Event ID
                </span>
                <span className="font-mono text-white font-bold">{selectedEvent.id}</span>
              </div>
              <div className="surface-sunken p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Timestamp
                </span>
                <span className="font-mono text-slate-300">{selectedEvent.timestamp}</span>
              </div>
              <div className="surface-sunken p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Event Category
                </span>
                <span className="font-mono text-accent-blue font-bold">
                  {selectedEvent.eventType}
                </span>
              </div>
              <div className="surface-sunken p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Security Status
                </span>
                <span
                  className={`font-mono font-bold uppercase ${STATUS_TEXT[selectedEvent.status]}`}
                >
                  {selectedEvent.status}
                </span>
              </div>
            </div>

            <div className="surface-sunken p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Log Description
              </span>
              <p className="text-sm font-semibold text-slate-100">{selectedEvent.description}</p>
            </div>

            <div className="surface-sunken p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Raw Security Verification Payload
              </span>
              <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto p-2 bg-ink-950 rounded">
{JSON.stringify(
  {
    event_id: selectedEvent.id,
    type: selectedEvent.eventType,
    severity: selectedEvent.status.toUpperCase(),
    guardrail: "PROMPTWALL_ACTION_GUARD_v2",
    verified: true,
  },
  null,
  2
)}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-primary text-xs px-4 py-2"
                onClick={() => setSelectedEvent(null)}
              >
                Close Trace Details
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AuditLog;
