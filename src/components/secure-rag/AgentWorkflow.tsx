"use client";

import React, { useState } from "react";
import type { StageId, StageStatus, WorkflowStage } from "@/types";
import {
  UserIcon,
  SearchIcon,
  FirewallIcon,
  CpuIcon,
  LockIcon,
  ToolIcon,
  DocIcon,
  SpinnerIcon,
  CheckIcon,
  ClockIcon,
  XIcon,
  AlertTriangleIcon,
} from "./icons";

interface AgentWorkflowProps {
  stages: WorkflowStage[];
}

const STAGE_ICONS: Record<StageId, React.FC<{ size?: number }>> = {
  user_request: UserIcon,
  scope_extraction: SearchIcon,
  rag_retrieval: SearchIcon,
  content_firewall: FirewallIcon,
  agent: CpuIcon,
  action_guard: LockIcon,
  tool_execution: ToolIcon,
  final_response: DocIcon,
};

const STAGE_DESCRIPTIONS: Record<StageId, string> = {
  user_request: "Raw user input prompt ingest & initial sanitization",
  scope_extraction: "Extracts goal, authorized tools, and restricted boundaries",
  rag_retrieval: "Retrieves context chunks from vector DB with strict tenant isolation",
  content_firewall: "Scans retrieved content for hidden prompt injections & jailbreaks",
  agent: "Core LLM reasoning engine planning next tool actions",
  action_guard: "Sandbox security policy verification before executing external tools",
  tool_execution: "Executes approved APIs and data operations securely",
  final_response: "Synthesizes final answer with security verification summary",
};

const STATUS_META: Record<
  StageStatus,
  {
    color: string;
    ring: string;
    bg: string;
    text: string;
    icon: React.FC<{ size?: number }>;
    label: string;
  }
> = {
  Pending: {
    color: "#A1A1A1",
    ring: "border-ink-600",
    bg: "bg-ink-850",
    text: "text-slate-400",
    icon: ClockIcon,
    label: "Pending",
  },
  Running: {
    color: "#DC2626",
    ring: "border-accent-blue",
    bg: "bg-accent-blue/15",
    text: "text-accent-blue",
    icon: SpinnerIcon,
    label: "Processing",
  },
  Passed: {
    color: "#A1A1A1",
    ring: "border-ink-600",
    bg: "bg-ink-850",
    text: "text-slate-300",
    icon: CheckIcon,
    label: "Passed",
  },
  Blocked: {
    color: "#EF4444",
    ring: "border-status-block/50",
    bg: "bg-status-block/10",
    text: "text-status-block",
    icon: XIcon,
    label: "Blocked",
  },
  Warning: {
    color: "#F87171",
    ring: "border-status-warn/50",
    bg: "bg-status-warn/10",
    text: "text-status-warn",
    icon: AlertTriangleIcon,
    label: "Threat",
  },
  Failed: {
    color: "#EF4444",
    ring: "border-status-block/50",
    bg: "bg-status-block/10",
    text: "text-status-block",
    icon: XIcon,
    label: "Failed",
  },
  "Waiting for Approval": {
    color: "#F87171",
    ring: "border-status-warn/50",
    bg: "bg-status-warn/10",
    text: "text-status-warn",
    icon: AlertTriangleIcon,
    label: "Escalated",
  },
};

const AgentWorkflow: React.FC<AgentWorkflowProps> = ({ stages }) => {
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);

  const activeStage = stages.find(
    (s) => s.status === "Running" || s.status === "Waiting for Approval"
  );

  const passedCount = stages.filter((s) => s.status === "Passed").length;
  const progressPct = Math.round((passedCount / stages.length) * 100);

  return (
    <section className="relative flex h-full flex-col justify-between">
      {/* Header with Title & Progress */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="section-title">Agent Security Pipeline Workflow</h2>
            <span className="chip border border-accent-blue/40 bg-accent-blue/10 text-[10px] font-extrabold text-accent-blue uppercase tracking-wider">
              Real-Time Security Graph
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress bar */}
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-ink-800 border border-ink-600">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${progressPct}%`,
                  backgroundImage: "linear-gradient(90deg, #DC2626, #EF4444)",
                }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-slate-300 tabular-nums">
              {progressPct}% ({passedCount}/{stages.length})
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Workflow Node Grid */}
      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {stages.map((stage, idx) => {
          const isSelected = selectedStage?.id === stage.id;
          const isLast = idx === stages.length - 1;
          return (
            <React.Fragment key={stage.id}>
              <StageNodeCard
                stage={stage}
                index={idx + 1}
                isActive={stage.id === activeStage?.id}
                isSelected={isSelected}
                onSelect={() => setSelectedStage(isSelected ? null : stage)}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* Selected Node Details Drawer / Modal Panel */}
      {selectedStage && (
        <div className="mt-4 surface-sunken p-4 border border-accent-blue/40 animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-ink-600 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="chip border border-accent-blue/40 bg-accent-blue/15 text-accent-blue font-mono font-bold text-[11px]">
                Stage {stages.findIndex((s) => s.id === selectedStage.id) + 1}: {selectedStage.id}
              </span>
              <h4 className="text-sm font-bold text-white">{selectedStage.label}</h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStage(null)}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Close Detail
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Stage Objective
              </span>
              <p className="text-slate-200">{STAGE_DESCRIPTIONS[selectedStage.id]}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Execution Status
              </span>
              <span className="font-semibold text-white">{selectedStage.status}</span>
              {selectedStage.durationMs !== undefined && (
                <span className="ml-2 font-mono text-[11px] text-slate-400">
                  ({selectedStage.durationMs}ms)
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Output telemetry
              </span>
              <p className="text-slate-200 font-mono text-[11px]">
                {selectedStage.result || selectedStage.detail || "No errors logged."}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Security Policy Evaluated
              </span>
              <p className="text-accent-blue font-mono text-[11px] font-bold">
                POLICY_ENFORCED_OK
              </p>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

const StageNodeCard: React.FC<{
  stage: WorkflowStage;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ stage, index, isActive, isSelected, onSelect }) => {
  const Icon = STAGE_ICONS[stage.id];
  const meta = STATUS_META[stage.status];
  const StatusIcon = meta.icon;

  const activeClasses = isActive
    ? "ring-2 ring-accent-blue scale-[1.03] z-10"
    : isSelected
    ? "ring-2 ring-accent-purple/80 border-accent-purple bg-accent-purple/10"
    : "";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`hover-lift relative flex flex-col items-center gap-2 rounded-xl border ${meta.ring} ${meta.bg} p-3 text-center cursor-pointer ${activeClasses} animate-fade-in-up w-full text-left`}
      style={{
        borderTopColor: isActive || stage.status === "Passed" ? meta.color : undefined,
        backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.04), transparent 55%)",
        boxShadow: isActive ? "var(--shadow-glow)" : "var(--shadow-3d-sm)",
        transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Node Index Badge */}
      <span
        className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink-800 font-mono text-[10px] font-bold text-slate-300"
        style={{ boxShadow: "var(--shadow-3d-sm)" }}
      >
        {index}
      </span>

      {/* Active Stage Pulsing Indicator */}
      {isActive && (
        <span
          className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full animate-pulse-soft"
          style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
        />
      )}

      {/* Node Icon */}
      <div
        className={`mt-3 flex h-10 w-10 items-center justify-center rounded-xl ${meta.bg} ${meta.text} ${
          stage.status === "Running" ? "animate-pulse-soft" : ""
        }`}
        style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.08)" }}
      >
        <Icon size={20} />
      </div>

      {/* Node Label */}
      <div
        className={`stage-label-flow text-[12.5px] font-bold leading-tight line-clamp-1 ${
          stage.status === "Passed" ? "stage-label-complete" : ""
        }`}
        style={{
          color:
            stage.status === "Passed" || stage.status === "Running"
              ? "transparent"
              : "#FFFFFF",
          backgroundImage:
            stage.status === "Running"
              ? "linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 35%, #EF4444 50%, #FFFFFF 65%, #FFFFFF 100%)"
              : stage.status === "Passed"
                ? "linear-gradient(90deg, #EF4444 0%, #F87171 50%, #EF4444 100%)"
                : undefined,
          backgroundSize: stage.status === "Running" ? "220% 100%" : "100% 100%",
          backgroundPosition: stage.status === "Passed" ? "100% 0" : undefined,
          WebkitBackgroundClip: stage.status === "Passed" || stage.status === "Running" ? "text" : undefined,
          backgroundClip: stage.status === "Passed" || stage.status === "Running" ? "text" : undefined,
        }}
      >
        {stage.label}
      </div>

      {/* Status Chip */}
      <div
        className="chip border border-ink-600 bg-ink-850 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: meta.color }}
      >
        <StatusIcon size={11} />
        {meta.label}
      </div>

      {stage.result && (
        <div className="text-[10px] leading-snug text-slate-400 line-clamp-2">
          {stage.result}
        </div>
      )}
      {stage.durationMs !== undefined && stage.durationMs > 0 && (
        <div className="text-[9px] font-mono tabular-nums text-slate-500">
          {stage.durationMs}ms
        </div>
      )}
    </button>
  );
};

export default AgentWorkflow;
