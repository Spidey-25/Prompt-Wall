import axios from "axios";
import type {
  AuditEvent,
  FinalResponse,
  SecurityDecision,
  WorkflowStage,
  EvaluationMetrics,
  AttackRunResult,
  AttackDef,
} from "@/types";

/**
 * REST API client for the Prompt Wall backend.
 *
 * All endpoints are placeholders — wire them to the real Node.js REST API.
 * Set NEXT_PUBLIC_API_BASE_URL (defaults to /api, served via Caddy gateway).
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// ---- Types for API contracts (placeholder shapes) ----
export interface RunAgentRequest {
  prompt: string;
}
export interface RunAgentResponse {
  runId: string;
  stages: WorkflowStage[];
  decision: SecurityDecision;
  audit: AuditEvent[];
  finalResponse: FinalResponse;
}

export interface HumanDecisionRequest {
  runId: string;
  approved: boolean;
}

// ---- Endpoint stubs ----
// Each function is a no-op placeholder that throws "not implemented".
// Replace the body with `return (await api.post(...))` etc. when the backend lands.
// NOTE: per the gateway rules, all calls use RELATIVE paths only; if a call
// targets a non-default backend port, append ?XTransformPort=<port> to the path.

export const ApiEndpoints = {
  health: () => "/health",
  runAgent: () => "/agent/run",
  humanDecision: () => "/agent/human-decision",
  metrics: () => "/evaluation/metrics",
  attacks: () => "/attacks",
  runAttack: () => "/attacks/run",
};

/** GET /health — backend liveness check. */
export async function checkHealth(): Promise<{ status: string }> {
  // return (await api.get(ApiEndpoints.health())).data;
  return Promise.resolve({ status: "ok" });
}

/** POST /agent/run — kick off the secure RAG agent pipeline. */
export async function runAgent(
  _body: RunAgentRequest
): Promise<RunAgentResponse> {
  // return (await api.post(ApiEndpoints.runAgent(), body)).data;
  return Promise.reject(new Error("runAgent: backend not implemented (mock mode)"));
}

/** POST /agent/human-decision — approve / reject a proposed action. */
export async function submitHumanDecision(
  _body: HumanDecisionRequest
): Promise<{ ok: boolean }> {
  // return (await api.post(ApiEndpoints.humanDecision(), body)).data;
  return Promise.reject(new Error("submitHumanDecision: backend not implemented"));
}

/** GET /evaluation/metrics — evaluation metrics snapshot. */
export async function fetchMetrics(): Promise<EvaluationMetrics> {
  // return (await api.get(ApiEndpoints.metrics())).data;
  return Promise.reject(new Error("fetchMetrics: backend not implemented"));
}

/** GET /attacks — list attack catalog. */
export async function fetchAttacks(): Promise<AttackDef[]> {
  // return (await api.get(ApiEndpoints.attacks())).data;
  return Promise.reject(new Error("fetchAttacks: backend not implemented"));
}

/** POST /attacks/run — run an attack against the protected agent. */
export async function runAttack(
  _attackId: string
): Promise<AttackRunResult> {
  // return (await api.post(ApiEndpoints.runAttack(), { attackId })).data;
  return Promise.reject(new Error("runAttack: backend not implemented"));
}
