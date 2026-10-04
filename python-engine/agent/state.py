"""
Agent state schema for the AgentShield LangGraph Agent.

Unified state object passed through all LangGraph nodes.
Follows the specification requirements for structured state.
"""

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class AgentPlan(TypedDict, total=False):
    """Structured agent planning output."""
    goal: str
    steps: List[str]
    required_tools: List[str]
    proposed_actions: List[Dict[str, Any]]


class AgentState(TypedDict, total=False):
    """Complete state object passed through LangGraph nodes."""

    # ---- Identity ----
    task_id: str

    # ---- Input ----
    user_request: str

    # ---- Scope Extractor (Stage 7) ----
    scope: Optional[Dict[str, Any]]

    # ---- RAG ----
    retrieved_context: List[Dict[str, Any]]     # [{source_id, text}]
    retrieved_documents: List[Dict[str, Any]]   # Raw docs before firewall

    # ---- Content Firewall (Stage 6) ----
    firewall_result: Optional[Dict[str, Any]]
    sanitized_context: List[Dict[str, Any]]     # After firewall sanitization

    # ---- Conversation / Reasoning ----
    messages: List[Dict[str, str]]

    # ---- Agent Planner ----
    agent_plan: Optional[AgentPlan]
    current_node: str                           # Currently executing node name

    # ---- Tool Execution ----
    proposed_tool: Optional[str]
    proposed_action: Optional[Dict[str, Any]]   # Full proposed action with reason
    tool_arguments: Optional[Dict[str, Any]]
    tool_result: Optional[Any]
    tool_calls: List[Dict[str, Any]]
    tool_results: List[Dict[str, Any]]

    # ---- Action Guard (Stage 8) ----
    action_guard_result: Optional[Dict[str, Any]]

    # ---- Security ----
    provenance: List[Dict[str, Any]]            # Data flow provenance tracking
    security_findings: List[Dict[str, Any]]     # All security findings across stages
    audit_events: List[Dict[str, Any]]          # Runtime audit trail

    # ---- Control Flow ----
    step_count: int
    execution_status: str                       # PENDING | RUNNING | COMPLETED | FAILED
    security_verdict: str                       # SAFE | THREAT_DETECTED | BLOCKED | ASK_HUMAN
    legitimate_task_status: str                 # PENDING | IN_PROGRESS | COMPLETED | BLOCKED

    # ---- Output ----
    final_response: Optional[str]
    error: Optional[str]

    # ---- Timing ----
    timing: Dict[str, float]                    # Per-stage latency in ms

    # ---- Metadata ----
    metadata: Dict[str, Any]
