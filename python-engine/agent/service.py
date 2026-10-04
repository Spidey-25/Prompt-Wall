"""
Agent Service — Wrapper orchestrating the AgentShield LangGraph Agent.

Workflow:
  API route → AgentService.run() → LangGraph (Scope → RAG → Firewall → Planner → Reasoning → Guard → Tools) → Response
"""

import time
import uuid
from typing import Any, Dict, List, Optional

from agent.graph import agent_graph
from agent.state import AgentState
from audit_store import append_events


class AgentService:
    """Invoke the AgentShield LangGraph Agent pipeline."""

    @staticmethod
    def run(message: str, retrieved_context: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Execute the AgentShield LangGraph agent for a user message.
        Returns a dict matching the full API response format including timing and audit data.
        """
        task_id = f"task-{uuid.uuid4().hex[:12]}"
        pipeline_start = time.perf_counter()

        initial_state: AgentState = {
            "task_id": task_id,
            "user_request": message,
            "scope": None,
            "retrieved_context": retrieved_context or [],
            "retrieved_documents": [],
            "sanitized_context": [],
            "firewall_result": None,
            "messages": [],
            "agent_plan": None,
            "current_node": "start",
            "final_response": None,
            "proposed_tool": None,
            "proposed_action": None,
            "tool_arguments": None,
            "tool_result": None,
            "tool_calls": [],
            "tool_results": [],
            "action_guard_result": None,
            "provenance": [],
            "security_findings": [],
            "audit_events": [],
            "step_count": 0,
            "execution_status": "RUNNING",
            "security_verdict": "SAFE",
            "legitimate_task_status": "IN_PROGRESS",
            "error": None,
            "timing": {},
            "metadata": {"task_id": task_id},
        }

        try:
            # Execute LangGraph workflow
            final_state: AgentState = agent_graph.invoke(initial_state)
        except Exception as exc:
            total_ms = round((time.perf_counter() - pipeline_start) * 1000, 2)
            return {
                "success": False,
                "task_id": task_id,
                "response": "",
                "error": str(exc),
                "execution_status": "FAILED",
                "timing": {"total_execution_ms": total_ms},
                "scope": None,
                "retrieved_context": [],
                "firewall_result": None,
                "action_guard_result": None,
                "agent_plan": None,
                "tool_used": None,
                "tool_result": None,
                "tool_calls": [],
                "tool_results": [],
                "security_findings": [],
                "audit_events": [],
                "provenance": [],
                "security_verdict": "SAFE",
                "legitimate_task_status": "FAILED",
            }

        total_ms = round((time.perf_counter() - pipeline_start) * 1000, 2)

        extracted_scope: Dict[str, Any] = final_state.get("scope") or {}
        retrieved_context: List[Dict[str, Any]] = final_state.get("retrieved_context", [])
        firewall_result: Dict[str, Any] = final_state.get("firewall_result") or {
            "status": "CLEAN",
            "classification": "BENIGN",
            "confidence": 1.0,
            "detections": [],
        }
        action_guard_result: Dict[str, Any] = final_state.get("action_guard_result") or {}
        tool_calls: List[Dict[str, Any]] = final_state.get("tool_calls", [])
        tool_results: List[Dict[str, Any]] = final_state.get("tool_results", [])
        audit_events = final_state.get("audit_events", [])
        append_events(audit_events)

        timing: Dict[str, Any] = final_state.get("timing", {})
        timing["total_execution_ms"] = total_ms

        # Extract last tool used for backwards compatibility
        last_tool = tool_calls[-1].get("tool") if tool_calls else None
        last_result = str(tool_results[-1].get("result")) if tool_results else None

        # Derive threat_detected for convenience
        fw_status = firewall_result.get("status", "CLEAN")
        threat_detected = fw_status in ("QUARANTINED", "FLAGGED")
        action_blocked = bool(action_guard_result.get("decision") == "BLOCK" or
                              any(t.get("blocked") for t in tool_calls))

        # Determine if legitimate task was completed
        final_response = final_state.get("final_response", "")
        legitimate_task_completed = bool(
            final_response and len(final_response.strip()) > 10
        )

        return {
            "success": True,
            "task_id": task_id,
            "response": final_response,
            "scope": extracted_scope,
            "retrieved_context": retrieved_context,
            "firewall_result": {
                **firewall_result,
                "threat_detected": threat_detected,
            },
            "action_guard_result": action_guard_result,
            "agent_plan": final_state.get("agent_plan"),
            "tool_used": last_tool,
            "tool_result": last_result,
            "tool_calls": tool_calls,
            "tool_results": tool_results,
            "security_findings": final_state.get("security_findings", []),
            "audit_events": audit_events,
            "provenance": final_state.get("provenance", []),
            "timing": timing,
            "execution_status": final_state.get("execution_status", "COMPLETED"),
            "security_verdict": final_state.get("security_verdict", "SAFE"),
            "legitimate_task_status": "COMPLETED" if legitimate_task_completed else final_state.get("legitimate_task_status", "IN_PROGRESS"),
            "threat_detected": threat_detected,
            "action_blocked": action_blocked,
            "tool_executed": bool(last_tool and not action_blocked),
            "legitimate_task_completed": legitimate_task_completed,
        }
