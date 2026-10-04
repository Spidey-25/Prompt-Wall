/**
 * PromptWall Backend API Client
 *
 * Connects the Next.js frontend to:
 *   - Node.js Express Backend (http://localhost:5000)
 *   - Python FastAPI Engine (http://localhost:8000)
 *
 * Provides real execution with fallback to client mock simulation when offline.
 */

export interface BackendHealth {
  success: boolean;
  service: string;
  status: string;
  pythonStatus?: {
    success: boolean;
    service: string;
    status: string;
  };
}

export interface AgentRunResponse {
  success: boolean;
  task_id?: string;
  response: string;
  scope?: Record<string, any>;
  retrieved_context?: Array<{ source_id: string; text: string; firewall_status?: string }>;
  firewall_result?: {
    safe?: boolean;
    threat_detected?: boolean;
    confidence?: number;
    reason?: string;
    threat_type?: string;
    violating_content?: string;
  };
  action_guard_result?: {
    allowed?: boolean;
    proposed_tool?: string;
    policy?: string;
    risk_level?: string;
    requires_approval?: boolean;
  };
  tool_used?: string | null;
  tool_result?: string | null;
  tool_calls?: Array<{ tool: string; arguments: any }>;
  tool_results?: Array<{ tool: string; result: any }>;
  audit_events?: Array<{
    id: string;
    timestamp: number | string;
    event_type: string;
    description: string;
    severity?: string;
    decision?: string;
    evidence?: string;
    rule?: string;
    tool?: string;
    risk_score?: number;
    ip_address?: string;
  }>;
  threat_detected?: boolean;
  action_blocked?: boolean;
  legitimate_task_completed?: boolean;
  error?: string;
}

export interface SecureChatResponse {
  success: boolean;
  answer?: string;
  error?: string;
  pipeline?: AgentRunResponse;
}

export interface UploadedFile {
  name: string;
  size: number;
  path: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

/** Check backend health */
export async function fetchBackendHealth(): Promise<BackendHealth | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

/** Execute AI agent task on backend */
export async function executeBackendAgent(message: string): Promise<AgentRunResponse | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(35000),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        response: "",
        error: errJson.error || `Backend returned status ${res.status}`,
      };
    }

    return await res.json();
  } catch (error: any) {
    return null; // Return null so caller falls back to mock runner
  }

}

/** Run the security pipeline, then ask Claude using only approved RAG context. */
export async function executeSecureChat(message: string): Promise<SecureChatResponse | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(120000),
    });
    const data = (await res.json().catch(() => ({}))) as SecureChatResponse;
    return res.ok ? data : { ...data, success: false };
  } catch {
    return null;
  }
}

/** Upload document files to backend sandbox for read_file & RAG */
export async function uploadBackendFiles(files: File[]): Promise<UploadedFile[]> {
  if (!files.length) return [];
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));

  try {
    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch (_) {
    return [];
  }
}

/** Fetch sandbox files from backend */
export async function fetchSandboxFiles(): Promise<Array<{ name: string; size: number; modified: string }>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/files`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch (_) {
    return [];
  }
}

// ─── Evaluation Types ────────────────────────────────────────────────────────

export interface EvaluationTestResult {
  test_id: string;
  category: string;
  user_prompt: string;
  expected_decision: string;
  actual_decision: string;
  threat_detected: boolean;
  action_blocked: boolean;
  tool_executed: boolean;
  legitimate_task_completed: boolean;
  passed: boolean;
  latency_ms: number;
  threat_classification?: string;
  violated_rule?: string;
  details: string;
}

export interface EvaluationRunSummary {
  evaluation_run_id: string;
  started_at: string;
  completed_at: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  benign_tests_count: number;
  attack_tests_count: number;
  ambiguous_tests_count: number;
  threats_detected_count: number;
  actions_blocked_count: number;
  legitimate_tasks_completed_count: number;
  ask_human_count: number;
  tool_actions_attempted: number;
  tool_actions_executed: number;
  false_positives: number;
  false_negatives: number;
  interception_rate_pct: number;
  benign_completion_rate_pct: number;
  average_latency_ms: number;
  avg_scope_extraction_latency_ms: number;
  avg_content_firewall_latency_ms: number;
  avg_action_guard_latency_ms: number;
  avg_planning_latency_ms: number;
  results: EvaluationTestResult[];
}

/** GET /api/evaluation/latest — fetch latest cached evaluation results. Returns null if none run yet. */
export async function fetchLatestEvaluation(): Promise<EvaluationRunSummary | null> {
  const urls = [
    "/api/evaluation/latest",
    "http://127.0.0.1:8000/evaluation/latest",
    "http://localhost:8000/evaluation/latest",
    `${BACKEND_URL}/api/evaluation/latest`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.evaluation) {
          return data.evaluation as EvaluationRunSummary;
        }
      }
    } catch (_) {}
  }
  return null;
}

/** POST /api/evaluation/run — trigger a full LangGraph evaluation suite run (may take several minutes). */
export async function triggerEvaluationRun(): Promise<EvaluationRunSummary | null> {
  const urls = [
    "/api/evaluation/run",
    "http://127.0.0.1:8000/evaluation/run",
    "http://localhost:8000/evaluation/run",
    `${BACKEND_URL}/api/evaluation/run`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(300000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.evaluation) {
          return data.evaluation as EvaluationRunSummary;
        }
      }
    } catch (_) {}
  }
  return null;
}
