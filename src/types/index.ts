// ===== Core workflow types =====

export type StageId =
  | "user_request"
  | "scope_extraction"
  | "rag_retrieval"
  | "content_firewall"
  | "agent"
  | "action_guard"
  | "tool_execution"
  | "final_response";

export type StageStatus =
  | "Pending"
  | "Running"
  | "Passed"
  | "Blocked"
  | "Warning"
  | "Failed"
  | "Waiting for Approval";

export interface WorkflowStage {
  id: StageId;
  label: string;
  status: StageStatus;
  detail?: string;
  /** Duration in ms (populated once the stage has run). */
  durationMs?: number;
  /** Short result text shown under the status (e.g. "3 documents retrieved"). */
  result?: string;
}

// ===== Authorized Scope (extracted from the user's request) =====

export interface Scope {
  goal: string;
  allowedTools: string[];
  restrictedTools: string[];
  allowedResources: string;
  externalRecipients: string;
}

// ===== Security decision (enhanced) =====

export type DecisionType = "ALLOW" | "BLOCK" | "ASK_HUMAN";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface BlockDetails {
  threatType: string;
  triggeringContent: string;
  violatedRule: string;
  proposedTool: string;
  reason: string;
  risk?: RiskLevel;
  policy?: string;
  evidence?: string;
  detectionLayer?: string;
  enforcementLayer?: string;
  confidence?: number; // 0-100
  maliciousActionStatus?: string;
  toolExecutionStatus?: string;
  legitimateTaskStatus?: string;
}

export interface AskHumanDetails {
  proposedAction: string;
  reason: string;
  tool?: string;
  resource?: string;
  recipient?: string;
}

export interface AllowDetails {
  summary?: string;
  firewallScan?: string;
  scopeCompliance?: string;
  toolExecutionStatus?: string;
  legitimateTaskStatus?: string;
}

export interface SecurityDecision {
  type: DecisionType;
  block?: BlockDetails;
  askHuman?: AskHumanDetails;
  allow?: AllowDetails;
}

// ===== Real-time metrics strip =====

export interface SecurityMetrics {
  requestsScanned: number;
  threatsDetected: number;
  actionsBlocked: number;
  humanApprovals: number;
  averageLatencyMs: number;
}

// ===== Live security event =====

export type EventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface LiveSecurityEvent {
  id: string;
  timestamp: string;
  message: string;
  severity: EventSeverity;
  icon?: "block" | "warn" | "safe" | "info";
}

// ===== Vendor comparison (for Final Response demo) =====

export interface VendorQuote {
  name: string;
  price: string;
  isLowest?: boolean;
}

export interface FinalResponse {
  text: string;
  ready: boolean;
  /** Vendor comparison data for the demo scenario. */
  vendors?: VendorQuote[];
  result?: string;
  securitySummary?: string[];
}

// ===== Audit log =====

export type AuditEventType =
  | "REQUEST_RECEIVED"
  | "SCOPE_EXTRACTED"
  | "RETRIEVAL"
  | "THREAT_DETECTED"
  | "CONTENT_QUARANTINED"
  | "TOOL_PROPOSED"
  | "TOOL_SKIPPED"
  | "ACTION_ALLOWED"
  | "ACTION_BLOCKED"
  | "HUMAN_CONFIRMATION"
  | "TASK_COMPLETED";

export type AuditStatus = "info" | "success" | "warning" | "danger";

export interface AuditEvent {
  id: string;
  timestamp: string; // ISO
  eventType: AuditEventType;
  status: AuditStatus;
  description: string;
}

// ===== Evaluation =====

export type MetricTone = "good" | "warn" | "info" | "danger";
export type MetricIconKind = "warning" | "check" | "agents" | "shield";

export interface MetricCard {
  key: string;
  label: string;
  value: string;
  tone: MetricTone;
  iconKind: MetricIconKind;
  /** Trend badge in the top-right. */
  trend?: {
    text: string;
    direction: "up" | "down" | "flat";
    /** When `goodWhenUp` is true, an upward trend is rendered green (else red). */
    goodWhenUp?: boolean;
  };
  /** Comparison/subtext line below the value. */
  subtext?: string;
  /** Sparkline data points (most recent last). */
  sparkline: number[];
}

export interface EvaluationMetrics {
  cards: MetricCard[];
}

// ===== Attack testing =====

export type AttackCategory =
  | "Plain Injection"
  | "Encoded Injection"
  | "Fake System Message"
  | "Tool-Response Injection"
  | "Multi-Step Exfiltration";

export type AttackResult = "BLOCKED" | "BYPASSED" | "PENDING";

export interface AttackDef {
  id: string;
  label: string;
  category: AttackCategory;
  payload: string;
}

export interface AttackRunResult {
  attackId: string;
  result: AttackResult;
  detail?: string;
}

// ===== Backend health =====

export type BackendStatus = "Connected" | "Disconnected" | "Connecting";

// ===== Final response =====

export interface FinalResponse {
  text: string;
  ready: boolean;
}
