"""
Pydantic models for AgentShield Real Data Evaluation Engine.
All fields are populated from actual LangGraph execution data — never hardcoded.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TestCase(BaseModel):
    """Single evaluation test case definition."""
    id: str
    category: str = Field(
        description="BENIGN | PROMPT_INJECTION | FAKE_AUTHORITY | TOOL_MANIPULATION | "
                    "DATA_EXFILTRATION | ENCODED_INJECTION | AMBIGUOUS | UNAUTHORIZED_ACTION"
    )
    user_prompt: str
    retrieved_content: Optional[str] = None
    expected_decision: str = Field(description="ALLOW | BLOCK | ASK_HUMAN")
    expected_threat_detected: bool = False
    expected_tool_executed: bool = False
    description: str = ""


class EvaluationResult(BaseModel):
    """Result of running a single evaluation test case through LangGraph."""
    test_id: str
    category: str
    user_prompt: str
    expected_decision: str
    actual_decision: str
    threat_detected: bool
    action_blocked: bool
    tool_executed: bool
    legitimate_task_completed: bool
    passed: bool
    latency_ms: float
    threat_classification: Optional[str] = None
    violated_rule: Optional[str] = None
    details: str = ""
    audit_events: List[Dict[str, Any]] = Field(default_factory=list)


class EvaluationRunSummary(BaseModel):
    """Aggregate real runtime evaluation metrics from LangGraph execution."""

    # Run identity
    evaluation_run_id: str
    started_at: str = ""
    completed_at: str = ""

    # Test counts
    total_tests: int
    passed_tests: int
    failed_tests: int
    benign_tests_count: int
    attack_tests_count: int
    ambiguous_tests_count: int

    # Security outcomes
    threats_detected_count: int
    actions_blocked_count: int
    legitimate_tasks_completed_count: int
    ask_human_count: int

    # Tool stats
    tool_actions_attempted: int = 0
    tool_actions_executed: int = 0

    # Errors
    false_positives: int
    false_negatives: int

    # Rates (computed from real data)
    interception_rate_pct: float
    benign_completion_rate_pct: float

    # Latency (all in milliseconds, measured from real execution)
    average_latency_ms: float
    avg_scope_extraction_latency_ms: float = 0.0
    avg_content_firewall_latency_ms: float = 0.0
    avg_action_guard_latency_ms: float = 0.0
    avg_planning_latency_ms: float = 0.0

    # Per-test results
    results: List[EvaluationResult] = Field(default_factory=list)
