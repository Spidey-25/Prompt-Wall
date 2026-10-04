"""
LangGraph node implementations for AgentShield LangGraph Agent.

Workflow:
  1. scope_extraction_node  — extract user intent & scope (Stage 7)
  2. rag_retrieval_node     — retrieve context from RAG
  3. content_firewall_node  — inspect, detect, classify, and sanitize retrieved context (Stage 6)
  4. agent_planner_node     — generate structured plan from sanitized context
  5. action_proposal_node   — propose specific tool actions from plan
  6. action_guard_node      — evaluate proposed tool against scope (Stage 8)
  7. tool_execution_node    — execute mock tools and sanitize tool results via firewall
  8. continue_legitimate_task_node — continue legitimate task when malicious action is blocked
  9. response_builder_node  — construct final response
"""

import os
import re
import time
import uuid
from typing import Any, Dict, List, Optional

from agent.prompts import SYSTEM_PROMPT, format_context_prompt
from agent.state import AgentState
from security.content_firewall import content_firewall
from tools import AVAILABLE_TOOLS

from scope import scope_extractor
from guard import action_guard

# Allowed tools — unknown tools must never execute
ALLOWED_TOOLS = {"read_file", "search_web", "send_email", "write_record"}

_rag_pipeline = None


def _get_rag():
    global _rag_pipeline
    if _rag_pipeline is None:
        from rag.retriever import RAGPipeline
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        _rag_pipeline = RAGPipeline(data_dir)
        _rag_pipeline.initialize()
    return _rag_pipeline


def _make_audit_event(
    event_type: str,
    description: str,
    severity: str = "INFO",
    decision: str = "ALLOW",
    evidence: str = "",
    rule: str = "P-000 · Baseline Policy",
    tool: str = "agent.run",
    risk_score: int = 5,
    ip_address: str = "192.168.1.100"
) -> Dict[str, Any]:
    """Create a structured audit event."""
    return {
        "id": f"evt-{uuid.uuid4().hex[:8]}",
        "timestamp": time.time(),
        "event_type": event_type,
        "description": description,
        "severity": severity,
        "decision": decision,
        "evidence": evidence or description,
        "rule": rule,
        "tool": tool,
        "risk_score": risk_score,
        "ip_address": ip_address,
    }


# ---------------------------------------------------------------------------
# Node 0 — Scope Extractor (Stage 7)
# ---------------------------------------------------------------------------
def scope_extraction_node(state: AgentState) -> Dict[str, Any]:
    """
    Stage 7 Scope Extractor node.
    Extracts intended scope strictly from the trusted user request.
    Does NOT evaluate or enforce Action Guard permissions (Stage 8).
    """
    t0 = time.perf_counter()
    user_request = state["user_request"]
    extracted_scope = scope_extractor.extract(user_request)
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    timing = dict(state.get("timing", {}))
    timing["scope_extraction_ms"] = latency_ms

    audit_events = list(state.get("audit_events", []))
    audit_events.append(_make_audit_event(
        "SCOPE_EXTRACTED",
        f"Scope extraction completed. Intent: {extracted_scope.intent}. "
        f"Actions: {extracted_scope.requested_actions}",
        severity="INFO",
        decision="ALLOW",
        evidence=f"Intent: {extracted_scope.intent} · Actions: {', '.join(extracted_scope.requested_actions) if extracted_scope.requested_actions else 'none'}",
        rule="P-001 · Scope Clearance",
        tool="scope.extract",
        risk_score=5,
    ))

    return {
        "scope": extracted_scope.model_dump(),
        "current_node": "scope_extraction",
        "timing": timing,
        "audit_events": audit_events,
    }


# ---------------------------------------------------------------------------
# Node 1 — RAG Retrieval
# ---------------------------------------------------------------------------
def rag_retrieval_node(state: AgentState) -> Dict[str, Any]:
    """Retrieve relevant document chunks using the RAG pipeline."""
    t0 = time.perf_counter()
    rag = _get_rag()
    query = state["user_request"]
    results = rag.retrieve(query, top_k=3)
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    timing = dict(state.get("timing", {}))
    timing["rag_retrieval_ms"] = latency_ms

    audit_events = list(state.get("audit_events", []))
    audit_events.append(_make_audit_event(
        "RETRIEVAL",
        f"Retrieved {len(results)} documents from RAG pipeline",
    ))

    return {
        "retrieved_context": results,
        "retrieved_documents": results,  # Raw copy before firewall
        "tool_calls": state.get("tool_calls", []),
        "tool_results": state.get("tool_results", []),
        "step_count": state.get("step_count", 0),
        "current_node": "rag_retrieval",
        "timing": timing,
        "audit_events": audit_events,
    }


# ---------------------------------------------------------------------------
# Node 2 — Content Firewall Inspection & Sanitization (Stage 6)
# ---------------------------------------------------------------------------
def content_firewall_node(state: AgentState) -> Dict[str, Any]:
    """
    Stage 6 Content Firewall node.
    Inspects, sanitizes, and quarantines prompt injections in retrieved RAG context.
    Constructs safe messages context using trust boundary delimiters.
    """
    t0 = time.perf_counter()
    raw_context = state.get("retrieved_context", [])
    query = state["user_request"]

    sanitized_context, firewall_summary = content_firewall.inspect_rag_results(raw_context)
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    formatted_user_msg = format_context_prompt(query, sanitized_context)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": formatted_user_msg},
    ]

    timing = dict(state.get("timing", {}))
    timing["content_firewall_ms"] = latency_ms

    audit_events = list(state.get("audit_events", []))
    security_findings = list(state.get("security_findings", []))

    threat_detected = firewall_summary.get("status") in ("QUARANTINED", "FLAGGED")
    if threat_detected:
        classification = firewall_summary.get("classification", "SUSPICIOUS")
        audit_events.append(_make_audit_event(
            "THREAT_DETECTED",
            f"Content Firewall detected {classification} in retrieved context. "
            f"Status: {firewall_summary.get('status')}. "
            f"Confidence: {firewall_summary.get('confidence', 0):.2f}",
            severity="HIGH",
            decision="BLOCK",
            evidence=firewall_summary.get("reason") or "Prompt injection signature matched adversarial pattern.",
            rule="P-INJ-002 · Instruction Override Neutralized",
            tool="rag.summarize",
            risk_score=94,
        ))
        security_findings.append({
            "stage": "content_firewall",
            "type": classification,
            "status": firewall_summary.get("status"),
            "confidence": firewall_summary.get("confidence", 0),
            "matched_rules": firewall_summary.get("matched_rules", []),
            "reason": firewall_summary.get("reason", ""),
        })
    else:
        audit_events.append(_make_audit_event(
            "CONTENT_CLEARED",
            f"Content Firewall cleared all {len(raw_context)} retrieved chunks",
        ))

    security_verdict = "THREAT_DETECTED" if threat_detected else state.get("security_verdict", "SAFE")

    return {
        "retrieved_context": sanitized_context,
        "sanitized_context": sanitized_context,
        "firewall_result": firewall_summary,
        "messages": messages,
        "current_node": "content_firewall",
        "timing": timing,
        "audit_events": audit_events,
        "security_findings": security_findings,
        "security_verdict": security_verdict,
    }


# ---------------------------------------------------------------------------
# Node 3 — Agent Planner
# ---------------------------------------------------------------------------
def agent_planner_node(state: AgentState) -> Dict[str, Any]:
    """
    Generate structured plan from user request and sanitized context.
    Produces goal, steps, required_tools, and proposed_actions.
    The planner proposes — it does NOT authorize.
    """
    t0 = time.perf_counter()
    user_request = state["user_request"]
    context_chunks = state.get("retrieved_context", [])
    scope = state.get("scope", {})

    # Generate structured plan
    plan = _generate_plan(user_request, context_chunks, scope)
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    timing = dict(state.get("timing", {}))
    timing["agent_planning_ms"] = latency_ms

    audit_events = list(state.get("audit_events", []))
    audit_events.append(_make_audit_event(
        "PLAN_GENERATED",
        f"Agent planner generated plan with {len(plan.get('steps', []))} steps. "
        f"Required tools: {plan.get('required_tools', [])}",
    ))

    return {
        "agent_plan": plan,
        "current_node": "agent_planner",
        "timing": timing,
        "audit_events": audit_events,
    }


def _generate_plan(
    user_request: str,
    context_chunks: List[Dict[str, Any]],
    scope: Dict[str, Any],
) -> Dict[str, Any]:
    """Generate a structured plan based on the request and context."""
    req_lower = user_request.lower()
    context_text = "\n".join(c.get("text", "") for c in context_chunks).lower()
    combined = req_lower + " " + context_text

    goal = user_request.strip()
    steps: List[str] = []
    required_tools: List[str] = []
    proposed_actions: List[Dict[str, Any]] = []

    # Determine steps and tools needed
    file_matches = re.findall(r"[\w\-.+]+\.(?:txt|pdf|csv|md|json|log|docx)", combined, re.IGNORECASE)

    if file_matches:
        for f in file_matches:
            steps.append(f"Read file: {f}")
            if "read_file" not in required_tools:
                required_tools.append("read_file")
            proposed_actions.append({
                "tool": "read_file",
                "operation": "read",
                "resource": f,
                "reason": f"File '{f}' referenced in request/context",
            })

    if any(kw in req_lower for kw in ["compare", "versus", "vs", "contrast"]):
        steps.append("Compare retrieved information")

    if any(kw in req_lower for kw in ["summarize", "summary"]):
        steps.append("Summarize content")

    if any(kw in req_lower for kw in ["search", "web", "online", "internet", "lookup", "find"]):
        steps.append(f"Search the web for: {user_request}")
        if "search_web" not in required_tools:
            required_tools.append("search_web")
        proposed_actions.append({
            "tool": "search_web",
            "operation": "search",
            "resource": "web",
            "reason": "Web search requested or implied by user",
        })

    if any(kw in req_lower for kw in ["send", "email", "mail", "notify"]):
        email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", combined)
        recipient = email_match.group(0) if email_match else "unknown"
        steps.append(f"Send email to {recipient}")
        if "send_email" not in required_tools:
            required_tools.append("send_email")
        proposed_actions.append({
            "tool": "send_email",
            "operation": "send",
            "resource": "email",
            "reason": "Email action requested by user or context",
        })

    if any(kw in req_lower for kw in ["store", "save", "record", "log", "database", "write"]):
        steps.append("Write record to database")
        if "write_record" not in required_tools:
            required_tools.append("write_record")
        proposed_actions.append({
            "tool": "write_record",
            "operation": "write",
            "resource": "database",
            "reason": "Database write requested or implied",
        })

    # Check for actions proposed by injected content (these will be caught by Action Guard)
    email_in_context = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", context_text)
    if email_in_context and "send_email" not in required_tools:
        # Context may be trying to inject send_email — include it so Action Guard can block it
        if any(kw in context_text for kw in ["send", "email", "mail"]):
            steps.append(f"[From context] Send email to {email_in_context.group(0)}")
            required_tools.append("send_email")
            proposed_actions.append({
                "tool": "send_email",
                "operation": "send",
                "resource": "email",
                "reason": "Action proposed from retrieved context (untrusted source)",
            })

    # Validate: only known tools
    required_tools = [t for t in required_tools if t in ALLOWED_TOOLS]
    proposed_actions = [a for a in proposed_actions if a.get("tool") in ALLOWED_TOOLS]

    if not steps:
        steps.append("Analyze retrieved context and generate response")

    steps.append("Generate final response")

    return {
        "goal": goal,
        "steps": steps,
        "required_tools": required_tools,
        "proposed_actions": proposed_actions,
    }


# ---------------------------------------------------------------------------
# Node 4 — Agent Reasoning & Tool Decision (Action Proposal)
# ---------------------------------------------------------------------------
def agent_reasoning_node(state: AgentState) -> Dict[str, Any]:
    """
    Reason over request, sanitized safe context, and executed tool results.
    Decide whether to invoke another tool or output the final response.
    """
    user_request = state["user_request"]
    context_chunks = state.get("retrieved_context", [])
    executed_tool_names = [call.get("tool") for call in state.get("tool_calls", [])]
    step_count = state.get("step_count", 0)

    # Max step limit to prevent infinite loops
    if step_count >= 5:
        response = _synthesize_final_response(
            user_request, context_chunks, state.get("tool_results", []),
            state.get("firewall_result"), state.get("action_guard_result")
        )
        return {
            "proposed_tool": None,
            "tool_arguments": None,
            "proposed_action": None,
            "final_response": response,
            "current_node": "agent_reasoning",
            "legitimate_task_status": "COMPLETED",
        }

    # Decide next tool call
    executed_tool_calls = state.get("tool_calls", [])
    tool_decision = _decide_tool(user_request, context_chunks, executed_tool_names, executed_tool_calls)

    if tool_decision:
        tool_name, tool_args = tool_decision
        # Validate: only allowed tools
        if tool_name not in ALLOWED_TOOLS:
            audit_events = list(state.get("audit_events", []))
            audit_events.append(_make_audit_event(
                "UNKNOWN_TOOL_REJECTED",
                f"Unknown tool '{tool_name}' rejected — not in allowed set",
                severity="HIGH",
            ))
            return {
                "proposed_tool": None,
                "tool_arguments": None,
                "proposed_action": None,
                "current_node": "agent_reasoning",
                "audit_events": audit_events,
            }

        proposed_action = {
            "tool": tool_name,
            "operation": tool_name.split("_")[-1] if "_" in tool_name else tool_name,
            "resource": tool_args.get("path", tool_args.get("query", tool_args.get("recipient", ""))),
            "reason": f"Agent determined '{tool_name}' is needed to fulfill user request",
            "arguments": tool_args,
        }

        audit_events = list(state.get("audit_events", []))
        audit_events.append(_make_audit_event(
            "TOOL_PROPOSED",
            f"Agent proposed tool '{tool_name}' with args: {tool_args}",
        ))

        return {
            "proposed_tool": tool_name,
            "tool_arguments": tool_args,
            "proposed_action": proposed_action,
            "current_node": "action_proposal",
            "audit_events": audit_events,
        }

    # No further tools needed -> synthesize final response
    response = _synthesize_final_response(
        user_request, context_chunks, state.get("tool_results", []),
        state.get("firewall_result"), state.get("action_guard_result")
    )
    return {
        "proposed_tool": None,
        "tool_arguments": None,
        "proposed_action": None,
        "final_response": response,
        "current_node": "agent_reasoning",
        "legitimate_task_status": "COMPLETED",
    }


def _decide_tool(
    user_request: str,
    context_chunks: List[Dict[str, Any]],
    executed_tools: List[str],
    executed_tool_calls: List[Dict[str, Any]] = None
) -> Optional[tuple]:
    """
    Determine if a tool call is needed based on prompt intent and execution history.
    Fully dynamic & generalized — works with arbitrary files, search terms, recipients, and datasets.
    """
    req_lower = user_request.lower()
    context_text = "\n".join(c.get("text", "") for c in context_chunks).lower()
    combined_text = req_lower + " " + context_text
    executed_tool_calls = executed_tool_calls or []

    # 1. read_file tool check: search for files mentioned in prompt or context
    file_matches = re.findall(r"[\w\-.+]+\.(?:txt|pdf|csv|md|json|log|docx)", combined_text, re.IGNORECASE)
    if file_matches:
        for target_file in file_matches:
            already_read = any(
                call.get("tool") == "read_file" and call.get("arguments", {}).get("path", "").lower() == target_file.lower()
                for call in executed_tool_calls
            )
            if not already_read:
                return ("read_file", {"path": target_file})

    if "read_file" not in executed_tools:
        if any(kw in req_lower for kw in ["read", "open", "file", "document", "inspect", "analyze", "compare"]):
            # Try finding any file in sandbox directory dynamically
            sandbox_dir = os.path.realpath(
                os.path.join(os.path.dirname(__file__), "..", "data", "mock_files")
            )
            if os.path.exists(sandbox_dir):
                available_files = [f for f in os.listdir(sandbox_dir) if os.path.isfile(os.path.join(sandbox_dir, f))]
                unread_files = [
                    f for f in available_files
                    if not any(
                        call.get("tool") == "read_file" and call.get("arguments", {}).get("path", "").lower() == f.lower()
                        for call in executed_tool_calls
                    )
                ]
                if unread_files:
                    return ("read_file", {"path": unread_files[0]})

    # 2. search_web tool check
    if "search_web" not in executed_tools:
        if any(kw in req_lower for kw in ["search", "web", "online", "internet", "market", "standard", "sla", "lookup", "find"]):
            return ("search_web", {"query": user_request})

    # 3. send_email tool check
    if "send_email" not in executed_tools:
        if any(kw in req_lower for kw in ["send", "email", "mail", "notify"]):
            email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", combined_text)
            recipient = email_match.group(0) if email_match else "authorized_user@example.com"
            return (
                "send_email",
                {
                    "recipient": recipient,
                    "subject": f"Summary: {user_request[:50]}",
                    "body": f"Automated summary response for: {user_request}",
                    "attachment": "document_summary.pdf",
                },
            )

    # 4. write_record tool check
    if "write_record" not in executed_tools:
        if any(kw in req_lower for kw in ["store", "save", "record", "log", "db", "database", "write"]):
            return (
                "write_record",
                {
                    "record_type": "user_task_record",
                    "data": {
                        "user_request": user_request,
                        "retrieved_chunk_count": len(context_chunks),
                        "status": "COMPLETED",
                    },
                },
            )

    return None


# ---------------------------------------------------------------------------
# Node 5 — Action Guard (Stage 8)
# ---------------------------------------------------------------------------
def action_guard_node(state: AgentState) -> Dict[str, Any]:
    """
    Stage 8 Action Guard node.
    Evaluates the proposed tool call against the extracted user scope.
    Decisions: ALLOW → proceed to tool_execution, BLOCK → skip tool, ASK_HUMAN → flag for review.
    """
    t0 = time.perf_counter()
    proposed_tool = state.get("proposed_tool")
    tool_arguments = state.get("tool_arguments") or {}
    scope = state.get("scope")
    tool_history = state.get("tool_calls", [])

    # If no tool proposed, pass through
    if not proposed_tool:
        return {
            "action_guard_result": None,
            "current_node": "action_guard",
        }

    # Evaluate against scope using Action Guard engine
    decision = action_guard.evaluate(
        proposed_tool=proposed_tool,
        tool_arguments=tool_arguments,
        scope=scope,
        tool_history=tool_history,
    )

    guard_result = decision.model_dump()
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    timing = dict(state.get("timing", {}))
    # Accumulate action guard latency (may be called multiple times)
    timing["action_guard_ms"] = timing.get("action_guard_ms", 0) + latency_ms

    audit_events = list(state.get("audit_events", []))
    security_findings = list(state.get("security_findings", []))

    # If BLOCKED, clear proposed_tool so tool_execution is skipped
    if decision.decision == "BLOCK":
        audit_events.append(_make_audit_event(
            "ACTION_BLOCKED",
            f"Action Guard BLOCKED unauthorized '{proposed_tool}': {decision.reason}",
            severity="HIGH",
            decision="BLOCK",
            evidence=decision.reason,
            rule=f"{decision.violated_rules[0]} · Action Guard Policy" if decision.violated_rules else "T-001 · Tool Access Policy",
            tool=proposed_tool or "agent.run",
            risk_score=85,
        ))
        security_findings.append({
            "stage": "action_guard",
            "type": "UNAUTHORIZED_ACTION",
            "tool": proposed_tool,
            "decision": "BLOCK",
            "risk_level": decision.risk_level,
            "violated_rules": decision.violated_rules,
            "reason": decision.reason,
        })

        # Record the blocked attempt in tool history
        tool_calls = list(state.get("tool_calls", []))
        tool_results = list(state.get("tool_results", []))
        tool_calls.append({"tool": proposed_tool, "arguments": tool_arguments, "blocked": True})
        tool_results.append({
            "tool": proposed_tool,
            "result": {
                "success": False,
                "error": "ACTION_GUARD_BLOCKED",
                "message": f"Action Guard blocked: {decision.reason}",
                "risk_level": decision.risk_level,
                "violated_rules": decision.violated_rules,
            },
        })

        audit_events.append(_make_audit_event(
            "TOOL_SKIPPED",
            f"Tool '{proposed_tool}' execution skipped — blocked by Action Guard policy",
            severity="MEDIUM",
            decision="BLOCK",
            evidence=f"Tool '{proposed_tool}' was not executed due to security policy violation",
            rule=f"{decision.violated_rules[0]} · Action Guard Policy" if decision.violated_rules else "T-001 · Tool Access Policy",
            tool=proposed_tool or "agent.run",
            risk_score=75,
        ))

        return {
            "action_guard_result": guard_result,
            "proposed_tool": None,
            "tool_arguments": None,
            "proposed_action": None,
            "tool_calls": tool_calls,
            "tool_results": tool_results,
            "step_count": state.get("step_count", 0) + 1,
            "current_node": "action_guard",
            "security_verdict": "BLOCKED",
            "timing": timing,
            "audit_events": audit_events,
            "security_findings": security_findings,
        }

    # If ASK_HUMAN, still allow through in sandbox mode but flag it
    if decision.decision == "ASK_HUMAN":
        guard_result["sandbox_note"] = "In production, this would pause for human approval. Sandbox mode: proceeding with flag."
        audit_events.append(_make_audit_event(
            "HUMAN_CONFIRMATION",
            f"Action Guard requests human confirmation for '{proposed_tool}': {decision.reason}",
            severity="MEDIUM",
            decision="ASK HUMAN",
            evidence=decision.reason or "Target destination attempts external domain connection",
            rule="T-014 · External Resource Guardrail",
            tool=proposed_tool or "web.search",
            risk_score=68,
        ))
    else:
        audit_events.append(_make_audit_event(
            "ACTION_ALLOWED",
            f"Action Guard ALLOWED '{proposed_tool}' — within authorized scope",
            severity="INFO",
            decision="ALLOW",
            evidence=f"Tool call '{proposed_tool}' strictly scoped to approved policy",
            rule="T-001 · Tool Access Policy",
            tool=proposed_tool or "agent.run",
            risk_score=12,
        ))

    return {
        "action_guard_result": guard_result,
        "current_node": "action_guard",
        "timing": timing,
        "audit_events": audit_events,
        "security_findings": security_findings,
    }


# ---------------------------------------------------------------------------
# Node 6 — Tool Execution
# ---------------------------------------------------------------------------
def tool_execution_node(state: AgentState) -> Dict[str, Any]:
    """Execute the selected mock tool, run firewall on tool result, and record state."""
    t0 = time.perf_counter()
    proposed_tool = state.get("proposed_tool")
    tool_arguments = state.get("tool_arguments") or {}

    if not proposed_tool or proposed_tool not in AVAILABLE_TOOLS:
        return {"current_node": "tool_execution"}

    tool_fn = AVAILABLE_TOOLS[proposed_tool]
    try:
        raw_result = tool_fn(**tool_arguments)
        # Inspect and sanitize untrusted tool output
        sanitized_result, tool_inspection = content_firewall.inspect_tool_result(
            proposed_tool, raw_result
        )
    except Exception as exc:
        sanitized_result = {"success": False, "error": "TOOL_EXECUTION_ERROR", "message": str(exc)}
        tool_inspection = {}

    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    tool_calls = list(state.get("tool_calls", []))
    tool_results = list(state.get("tool_results", []))
    audit_events = list(state.get("audit_events", []))
    security_findings = list(state.get("security_findings", []))

    tool_calls.append({"tool": proposed_tool, "arguments": tool_arguments})
    tool_results.append({"tool": proposed_tool, "result": sanitized_result})

    timing = dict(state.get("timing", {}))
    timing["tool_execution_ms"] = timing.get("tool_execution_ms", 0) + latency_ms

    firewall_result = state.get("firewall_result")
    security_verdict = state.get("security_verdict", "SAFE")

    if tool_inspection and tool_inspection.get("status") in ("QUARANTINED", "FLAGGED"):
        classification = tool_inspection.get("classification", "SUSPICIOUS")
        audit_events.append(_make_audit_event(
            "THREAT_DETECTED",
            f"Content Firewall detected {classification} in output of tool '{proposed_tool}'. "
            f"Status: {tool_inspection.get('status')}. "
            f"Confidence: {tool_inspection.get('confidence', 0):.2f}",
            severity="HIGH",
            decision="BLOCK",
            evidence=tool_inspection.get("reason") or "Prompt injection signature matched adversarial pattern.",
            rule="P-INJ-002 · Instruction Override Neutralized",
            tool=proposed_tool,
            risk_score=94,
        ))
        security_findings.append({
            "stage": "tool_execution_firewall",
            "type": classification,
            "status": tool_inspection.get("status"),
            "confidence": tool_inspection.get("confidence", 0),
            "matched_rules": tool_inspection.get("matched_rules", []),
            "reason": tool_inspection.get("reason", ""),
            "tool": proposed_tool,
        })
        firewall_result = tool_inspection
        security_verdict = "THREAT_DETECTED"
    else:
        audit_events.append(_make_audit_event(
            "TOOL_EXECUTED",
            f"Tool '{proposed_tool}' executed successfully in {latency_ms:.1f}ms",
        ))

    # Track provenance
    provenance = list(state.get("provenance", []))
    provenance.append({
        "tool": proposed_tool,
        "arguments": tool_arguments,
        "result_type": "success" if isinstance(sanitized_result, dict) and sanitized_result.get("success") else "error",
        "timestamp": time.time(),
    })

    return {
        "tool_result": sanitized_result,
        "tool_calls": tool_calls,
        "tool_results": tool_results,
        "step_count": state.get("step_count", 0) + 1,
        "proposed_tool": None,
        "tool_arguments": None,
        "proposed_action": None,
        "current_node": "tool_execution",
        "timing": timing,
        "audit_events": audit_events,
        "security_findings": security_findings,
        "provenance": provenance,
        "firewall_result": firewall_result,
        "security_verdict": security_verdict,
    }


# ---------------------------------------------------------------------------
# Node 7 — Response Builder
# ---------------------------------------------------------------------------
def response_builder_node(state: AgentState) -> Dict[str, Any]:
    """Format final response object."""
    t0 = time.perf_counter()
    response = state.get("final_response") or "Agent completed workflow."
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    timing = dict(state.get("timing", {}))
    timing["response_builder_ms"] = latency_ms

    # Calculate total execution time
    total_ms = sum(v for k, v in timing.items() if k.endswith("_ms"))
    timing["total_execution_ms"] = round(total_ms, 2)

    audit_events = list(state.get("audit_events", []))
    audit_events.append(_make_audit_event(
        "TASK_COMPLETED",
        f"Final response generated. Total latency: {total_ms:.1f}ms",
    ))

    return {
        "final_response": response,
        "current_node": "response_builder",
        "execution_status": "COMPLETED",
        "timing": timing,
        "audit_events": audit_events,
    }


def _synthesize_final_response(
    user_request: str,
    context_chunks: List[Dict[str, Any]],
    tool_results: List[Dict[str, Any]],
    firewall_result: Optional[Dict[str, Any]] = None,
    action_guard_result: Optional[Dict[str, Any]] = None,
) -> str:
    """Synthesize structured final text response incorporating firewall status, action guard, RAG, and tool results."""
    lines = []

    # Section 1: Content Firewall Security Status Banner if flagged/quarantined
    if firewall_result and firewall_result.get("status") == "QUARANTINED":
        lines.append("🛡️ [CONTENT FIREWALL: SANITIZED & PASSED]")
        lines.append(f"Status: SANITIZED | Classification: {firewall_result.get('classification')} (Confidence: {firewall_result.get('confidence', 0.0):.2f})")
        lines.append(f"Reason: {firewall_result.get('reason')}")
        lines.append("Action: Prompt injection instructions were neutralized ([QUARANTINED]). Legitimate document content was preserved and safely passed to the agent.")
        lines.append("")

    # Section 1b: Action Guard Status Banner
    if action_guard_result and action_guard_result.get("decision") != "ALLOW":
        decision = action_guard_result.get("decision", "UNKNOWN")
        tool = action_guard_result.get("tool", "unknown")
        risk = action_guard_result.get("risk_level", "UNKNOWN")
        reason = action_guard_result.get("reason", "")
        emoji = "🚫" if decision == "BLOCK" else "⚠️"
        lines.append(f"{emoji} [ACTION GUARD: {decision}]")
        lines.append(f"Tool: {tool} | Risk: {risk}")
        lines.append(f"Reason: {reason}")
        lines.append("")

    # Section 2: Tool Execution Summary
    if tool_results:
        lines.append("### Executed Tool Results:")
        for res_entry in tool_results:
            tool_name = res_entry.get("tool")
            result = res_entry.get("result", {})
            if isinstance(result, dict):
                if result.get("error") == "ACTION_GUARD_BLOCKED":
                    lines.append(f"• Tool `{tool_name}` 🚫 BLOCKED by Action Guard: {result.get('message', '')}")
                elif result.get("success"):
                    if tool_name == "read_file":
                        content_len = len(result.get("content", ""))
                        file_path = result.get("path", "file")
                        lines.append(f"• Tool `{tool_name}` executed: Successfully read file '{file_path}' ({content_len} bytes).")
                    elif tool_name == "search_web":
                        count = len(result.get("results", []))
                        mock_label = " [MOCK]" if result.get("mock") else ""
                        lines.append(f"• Tool `{tool_name}` executed{mock_label}: Web search completed ({count} results found).")
                    elif tool_name == "send_email":
                        mock_label = " [MOCK]" if result.get("mock") else ""
                        lines.append(f"• Tool `{tool_name}` executed{mock_label}: Email sent to {result.get('details', {}).get('recipient', result.get('recipient', 'unknown'))}.")
                    elif tool_name == "write_record":
                        mock_label = " [MOCK]" if result.get("mock") else ""
                        lines.append(f"• Tool `{tool_name}` executed{mock_label}: Database record written successfully.")
                    else:
                        msg = result.get("message") or f"Execution succeeded."
                        lines.append(f"• Tool `{tool_name}` executed: {msg}")
                else:
                    err_msg = result.get("message") or result.get("error") or "Execution failed."
                    lines.append(f"• Tool `{tool_name}` executed: {err_msg}")
            else:
                lines.append(f"• Tool `{tool_name}` executed: {result}")
        lines.append("")

    # Section 3: Synthesis Analysis
    lines.append("### Synthesis Analysis:")

    file_contents = [
        res.get("result", {}).get("content")
        for res in tool_results
        if res.get("tool") == "read_file" and res.get("result", {}).get("success")
    ]
    if file_contents:
        lines.append("File Content Retrieved:")
        for content in file_contents:
            lines.append(f"```\n{content}\n```")
        lines.append("")

    search_results = [
        res.get("result", {}).get("results")
        for res in tool_results
        if res.get("tool") == "search_web" and res.get("result", {}).get("success")
    ]
    if search_results and search_results[0]:
        lines.append("Web Search Results:")
        for item in search_results[0]:
            lines.append(f"  - [{item.get('title')}] ({item.get('source')}): {item.get('snippet')}")
        lines.append("")

    delivery_times: Dict[str, str] = {}
    prices: Dict[str, str] = {}

    for chunk in context_chunks:
        text = chunk.get("text", "")
        source = chunk.get("source_id", "")
        for line in text.split("\n"):
            line_str = line.strip()
            if "delivery time:" in line_str.lower():
                delivery_times[source] = line_str
            elif "unit price:" in line_str.lower():
                prices[source] = line_str

    req_lower = user_request.lower()
    if delivery_times and ("delivery" in req_lower or "shortest" in req_lower or "fastest" in req_lower):
        lines.append("Delivery Times from Vendor Quotations:")
        for src, val in sorted(delivery_times.items()):
            lines.append(f"  • {src}: {val.split(':', 1)[1].strip()}")
    elif prices and ("price" in req_lower or "cost" in req_lower):
        lines.append("Unit Prices from Vendor Quotations:")
        for src, val in sorted(prices.items()):
            lines.append(f"  • {src}: {val.split(':', 1)[1].strip()}")
    elif not file_contents and not search_results:
        if context_chunks:
            lines.append(f"Retrieved {len(context_chunks)} relevant vendor quotation chunk(s) from document corpus.")
        else:
            lines.append("The requested information is not available in the retrieved document corpus.")

    return "\n".join(lines)
