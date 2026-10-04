"use client";

import React, { useCallback, useRef, useState } from "react";
import type {
  AuditEvent,
  FinalResponse,
  SecurityDecision,
  WorkflowStage,
  StageStatus,
  LiveSecurityEvent,
  EventSeverity,
} from "@/types";
import { INITIAL_STAGES, DEMO_SCOPE, SEED_METRICS_STRIP, SEED_LIVE_EVENTS } from "@/lib/secure-rag/mockData";
import {
  runMockPipeline,
  mockResolveHuman,
  type PipelineEvent,
} from "@/lib/secure-rag/mockPipeline";

import PageShell from "@/components/secure-rag/PageShell";
import UserRequest from "@/components/secure-rag/UserRequest";
import AuthorizedScope from "@/components/secure-rag/AuthorizedScope";
import AgentWorkflow from "@/components/secure-rag/AgentWorkflow";
import SecurityDecisionPanel from "@/components/secure-rag/SecurityDecision";
import FinalResponsePanel from "@/components/secure-rag/FinalResponse";
import MetricsStrip from "@/components/secure-rag/MetricsStrip";
import LiveEventStream from "@/components/secure-rag/LiveEventStream";
import Reveal from "@/components/secure-rag/Reveal";
import { executeBackendAgent } from "@/lib/api/backendClient";
import { ingestBackendAuditEvents } from "@/lib/auditEventStore";
import { ShieldIcon } from "@/components/secure-rag/icons";

/**
 * Agent Playground — submit an AI-agent task and watch the complete
 * PromptWall security pipeline execute.
 */
export default function PlaygroundPage() {
  const [stages, setStages] = useState<WorkflowStage[]>(INITIAL_STAGES);
  const [decision, setDecision] = useState<SecurityDecision | null>(null);
  const [finalResponse, setFinalResponse] = useState<FinalResponse | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveSecurityEvent[]>(SEED_LIVE_EVENTS);
  const [running, setRunning] = useState(false);
  const [resolving, setResolving] = useState(false);

  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const resultRef = useRef<HTMLDivElement>(null);

  const emit = useCallback((ev: PipelineEvent) => {
    if (ev.stage) {
      setStages((prev) =>
        prev.map((s) => (s.id === ev.stage!.id ? { ...ev.stage! } : s))
      );
    }
    if (ev.decision) setDecision(ev.decision!);
    if (ev.finalResponse) setFinalResponse(ev.finalResponse!);
    if (ev.audit) {
      const sev: EventSeverity =
        ev.audit.status === "danger"
          ? "HIGH"
          : ev.audit.status === "warning"
          ? "MEDIUM"
          : "LOW";
      const newEv: LiveSecurityEvent = {
        id: ev.audit.id,
        timestamp: ev.audit.timestamp,
        message: ev.audit.description,
        severity: sev,
      };
      setLiveEvents((prev) => [newEv, ...prev]);
    }
  }, []);

  const resetPipeline = useCallback(() => {
    setStages(INITIAL_STAGES.map((s) => ({ ...s, status: "Pending" })));
    setDecision(null);
    setFinalResponse(null);
    setLiveEvents([]);
  }, []);

  const handleRun = useCallback(
    async (prompt: string) => {
      cancelRef.current = { cancelled: false };
      setRunning(true);
      resetPipeline();

      try {
        // Attempt real backend server execution first
        const backendRes = await executeBackendAgent(prompt);

        if (backendRes && backendRes.success) {
          const stagesList: WorkflowStage[] = INITIAL_STAGES.map((s) => ({
            ...s,
            status: "Passed" as StageStatus,
          }));

          setStages(stagesList);

          if (backendRes.firewall_result && backendRes.firewall_result.threat_detected) {
            setDecision({
              type: "BLOCK",
              block: {
                threatType: backendRes.firewall_result.threat_type || "Prompt Injection",
                triggeringContent: backendRes.firewall_result.violating_content || prompt,
                violatedRule: backendRes.firewall_result.reason || "P-Inj Policy Violation",
                proposedTool: backendRes.tool_used || "send_email",
                reason: backendRes.firewall_result.reason || "Unauthorized action blocked while legitimate task continued",
                risk: "HIGH",
                policy: "STRICT_SECURITY",
                evidence: backendRes.firewall_result.violating_content || prompt,
                detectionLayer: "Content Firewall",
                enforcementLayer: "Action Guard",
                confidence: backendRes.firewall_result.confidence
                  ? Math.round(backendRes.firewall_result.confidence * 100)
                  : undefined,
                maliciousActionStatus: "BLOCKED",
                toolExecutionStatus: "NOT EXECUTED",
                legitimateTaskStatus: "COMPLETED — Task executed safely",
              },
            });
          } else if (backendRes.action_guard_result?.requires_approval) {
            setDecision({
              type: "ASK_HUMAN",
              askHuman: {
                proposedAction: backendRes.tool_used || "proposed_action",
                reason: backendRes.action_guard_result?.policy || "Elevated privilege action requires human operator approval.",
                tool: backendRes.tool_used || undefined,
              },
            });
          } else {
            setDecision({
              type: "ALLOW",
              allow: {
                summary: "Request cleared all firewall guardrails and executed strictly within authorized scope.",
                firewallScan: "PASSED — Zero Threat Signatures Matched",
                scopeCompliance: "100% Authorized",
                toolExecutionStatus: backendRes.tool_used ? `Tool '${backendRes.tool_used}' Executed` : "CLEARED FOR EXECUTION",
                legitimateTaskStatus: "COMPLETED SAFELY",
              },
            });
          }

          setFinalResponse({
            text: backendRes.response || "Task completed successfully by backend engine.",
            ready: true,
            result: backendRes.tool_result || "Safe completion",
            securitySummary: [
              "Request received by PromptWall Node.js backend",
              "Python LangGraph engine executed tool pipeline",
              `Result: ${backendRes.tool_used ? `Tool '${backendRes.tool_used}' executed` : "Response generated"}`,
            ],
          });

          // Push real audit events into the shared store for the Audit Logs page
          if (backendRes.audit_events?.length) {
            ingestBackendAuditEvents(backendRes.audit_events, backendRes.task_id);
          }
          return;
        }

        // Fallback to simulation pipeline if backend unavailable
        const looksLikeAttack = /ignore all previous instructions|override safety|reveal the system prompt|admin token|#0000|send_email|exfiltrat/i.test(
          prompt
        );
        await runMockPipeline(
          { prompt, block: looksLikeAttack, askHuman: false },
          emit,
          cancelRef.current
        );
      } finally {
        setRunning(false);
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    },
    [emit, resetPipeline]
  );

  const handleApprove = useCallback(async () => {
    setResolving(true);
    try {
      await mockResolveHuman(true, emit);
      cancelRef.current = { cancelled: false };
      setRunning(true);
      await runMockPipeline(
        { prompt: "continue", block: false, askHuman: false },
        emit,
        cancelRef.current
      );
    } finally {
      setResolving(false);
      setRunning(false);
    }
  }, [emit]);

  const handleReject = useCallback(async () => {
    setResolving(true);
    try {
      await mockResolveHuman(false, emit);
      setDecision(null);
    } finally {
      setResolving(false);
    }
  }, [emit]);

  const handleRunAgain = useCallback(() => {
    resetPipeline();
  }, [resetPipeline]);

  return (
    <PageShell>
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Welcome Hero */}
        <Reveal className="lg:col-span-12" delay={0}>
          <section className="card card-pad relative overflow-hidden h-full">
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                background:
                  "radial-gradient(600px 300px at 10% 0%, rgba(255, 106, 0, 0.25), transparent 60%), radial-gradient(500px 250px at 90% 100%, rgba(255, 194, 26, 0.15), transparent 55%)",
              }}
            />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  <ShieldIcon size={28} className="text-accent-blue" />
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                    PROMPT<span className="text-gradient-warm">WALL</span>
                  </h1>
                </div>
                <p className="mt-2 text-lg font-bold md:text-xl max-w-lg leading-snug">
                  <span className="text-slate-900 dark:text-white">Secure the Prompt,</span>
                  {" "}
                  <span className="text-gradient-warm">Protect the Data</span>
                </p>
                <p className="mt-2 text-xs text-slate-400 md:text-sm">
                  Welcome to PromptWall Security Command Center &amp; Agent Playground. Execute secure AI task instructions below with real-time prompt injection firewall protection.
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        {/* User Request + Authorized Scope */}
        <Reveal className="lg:col-span-7" delay={80}>
          <UserRequest onRun={handleRun} disabled={running} />
        </Reveal>
        <Reveal className="lg:col-span-5" delay={200}>
          <AuthorizedScope scope={DEMO_SCOPE} />
        </Reveal>



        {/* Agent Workflow */}
        <Reveal className="lg:col-span-12" delay={150}>
          <AgentWorkflow stages={stages} />
        </Reveal>

        {/* Security Decision + Final Response */}
        <div ref={resultRef} className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-5 scroll-mt-6">
          <Reveal className="lg:col-span-7" delay={100}>
            <SecurityDecisionPanel
              decision={decision}
              onApprove={handleApprove}
              onReject={handleReject}
              resolving={resolving}
            />
          </Reveal>
          <Reveal className="lg:col-span-5" delay={250}>
            <FinalResponsePanel response={finalResponse} onRunAgain={handleRunAgain} />
          </Reveal>
        </div>

        {/* Live security events */}
        <Reveal className="lg:col-span-12" delay={150}>
          <LiveEventStream events={liveEvents} />
        </Reveal>
      </div>
    </PageShell>
  );
}
