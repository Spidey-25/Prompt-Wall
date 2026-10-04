/**
 * Shared Audit Event Store
 *
 * In-memory store that bridges real AgentShield execution events
 * from the Playground and backend into the Audit Logs page.
 *
 * Events are persisted to sessionStorage so they survive page
 * navigations within the same tab.
 */

const STORAGE_KEY = "promptwall_audit_events";

export interface RealAuditEvent {
  id: string;
  timestamp: string; // ISO string
  eventType: string;
  status: "info" | "success" | "warning" | "danger";
  description: string;
  decision: string;
  evidence: string;
  rule: string;
  tool: string;
  riskScore: number;
  ipAddress: string;
  executionId?: string;
}

type Listener = (events: RealAuditEvent[]) => void;

const listeners: Set<Listener> = new Set();
let cachedEvents: RealAuditEvent[] | null = null;

function loadFromStorage(): RealAuditEvent[] {
  if (cachedEvents !== null) return cachedEvents;
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    cachedEvents = raw ? JSON.parse(raw) : [];
    return cachedEvents!;
  } catch {
    cachedEvents = [];
    return [];
  }
}

function saveToStorage(events: RealAuditEvent[]): void {
  cachedEvents = events;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Storage full — just keep in-memory
  }
}

function notifyListeners(): void {
  const events = loadFromStorage();
  listeners.forEach((fn) => fn(events));
}

/** Get all stored audit events (most recent first). */
export function getAuditEvents(): RealAuditEvent[] {
  return loadFromStorage();
}

/** Append one or more audit events from a real execution. */
export function appendAuditEvents(newEvents: RealAuditEvent[]): void {
  if (!newEvents.length) return;
  const current = loadFromStorage();
  const updated = [...newEvents, ...current];
  saveToStorage(updated);
  notifyListeners();
}

/** Clear all stored audit events. */
export function clearAuditEvents(): void {
  saveToStorage([]);
  notifyListeners();
}

/** Subscribe to audit event changes. Returns unsubscribe function. */
export function subscribeAuditEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Map severity string from the Python backend to the frontend AuditStatus.
 */
function mapSeverityToStatus(severity: string): RealAuditEvent["status"] {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
    case "HIGH":
      return "danger";
    case "MEDIUM":
    case "WARNING":
      return "warning";
    case "LOW":
    case "INFO":
    default:
      return "info";
  }
}

/**
 * Map event type to a status for display.
 */
function eventTypeToStatus(eventType: string): RealAuditEvent["status"] {
  switch (eventType) {
    case "THREAT_DETECTED":
    case "CONTENT_QUARANTINED":
    case "ACTION_BLOCKED":
      return "danger";
    case "HUMAN_CONFIRMATION":
    case "TOOL_SKIPPED":
      return "warning";
    case "ACTION_ALLOWED":
    case "TASK_COMPLETED":
      return "success";
    default:
      return "info";
  }
}

/**
 * Convert raw audit events from the Python backend response
 * into normalized RealAuditEvent objects and append them to the store.
 */
export function ingestBackendAuditEvents(
  rawEvents: Array<{
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
  }>,
  executionId?: string
): void {
  if (!rawEvents?.length) return;

  const normalized: RealAuditEvent[] = rawEvents.map((raw) => ({
    id: raw.id,
    timestamp:
      typeof raw.timestamp === "number"
        ? new Date(raw.timestamp * 1000).toISOString()
        : raw.timestamp,
    eventType: raw.event_type,
    status: eventTypeToStatus(raw.event_type),
    description: raw.description,
    decision: raw.decision || "ALLOW",
    evidence: raw.evidence || raw.description,
    rule: raw.rule || "P-000 · Baseline Policy",
    tool: raw.tool || "agent.run",
    riskScore: raw.risk_score ?? 5,
    ipAddress: raw.ip_address || "127.0.0.1",
    executionId,
  }));

  appendAuditEvents(normalized);
}
