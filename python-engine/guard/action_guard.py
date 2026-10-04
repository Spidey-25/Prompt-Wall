"""
Action Guard Module (Stage 8 — PromptWall).

Enforces authorization boundaries on proposed tool calls by comparing them
against the trusted user scope extracted in Stage 7 (Scope Extractor).

References AgentShield Security Policy (rules.yaml):
  - Section 9: Tool Authorization (T001–T005)
  - Section 11: External Actions (X001–X003)
  - Section 15: Multi-Step Attack Protection (M001–M005)
  - Section 10: Sensitive Data (D001–D005)

Decisions:
  - ALLOW  — Tool call is within user-defined scope.
  - BLOCK  — Tool call violates scope or security policy.
  - ASK_HUMAN — Authorization is ambiguous; human confirmation required.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from security.rulebook import get_rulebook


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ActionGuardDecision(BaseModel):
    """Result of Action Guard evaluation for a single proposed tool call."""
    decision: str = Field(description="ALLOW | BLOCK | ASK_HUMAN")
    tool: str = Field(description="Name of the proposed tool")
    arguments: Dict[str, Any] = Field(default_factory=dict)
    risk_level: str = Field(default="LOW", description="LOW | MEDIUM | HIGH | CRITICAL")
    violated_rules: List[str] = Field(default_factory=list, description="Rule IDs violated")
    reason: str = Field(default="", description="Human-readable explanation")
    scope_match: bool = Field(default=True, description="Whether tool is within extracted scope")


class ActionGuardSummary(BaseModel):
    """Aggregate summary of all Action Guard decisions in a pipeline run."""
    total_proposals: int = 0
    allowed: int = 0
    blocked: int = 0
    ask_human: int = 0
    decisions: List[ActionGuardDecision] = Field(default_factory=list)
    highest_risk: str = "LOW"


# ---------------------------------------------------------------------------
# Action Guard Engine
# ---------------------------------------------------------------------------

class ActionGuard:
    """
    Stage 8 Action Guard.

    Evaluates each proposed tool call against:
    1. Extracted scope (from Stage 7 Scope Extractor)
    2. Rulebook tool authorization policies (Section 9)
    3. Sensitive data policies (Section 10)
    4. External action policies (Section 11)
    5. Multi-step attack detection (Section 15)
    """

    # Tool risk levels from rulebook Section 9
    TOOL_RISK = {
        "read_file": "LOW",
        "search_web": "LOW",
        "send_email": "HIGH",
        "write_record": "HIGH",
    }

    # Tools requiring explicit user authorization (Section 9)
    EXPLICIT_AUTH_TOOLS = {"send_email", "write_record"}

    # Sensitive file patterns (Section 10)
    SENSITIVE_FILE_PATTERNS = [
        "confidential", "secret", "private", "credential",
        "password", "internal", "restricted", "key",
    ]

    def __init__(self):
        self.rulebook = get_rulebook()

    def evaluate(
        self,
        proposed_tool: str,
        tool_arguments: Dict[str, Any],
        scope: Optional[Dict[str, Any]],
        tool_history: Optional[List[Dict[str, Any]]] = None,
    ) -> ActionGuardDecision:
        """
        Evaluate a proposed tool call against the trusted user scope.

        Args:
            proposed_tool: Name of the tool being proposed.
            tool_arguments: Arguments for the proposed tool call.
            scope: Extracted scope from Stage 7 (TaskScope dict).
            tool_history: List of previously executed tool calls in this session.

        Returns:
            ActionGuardDecision with ALLOW, BLOCK, or ASK_HUMAN.
        """
        violated_rules: List[str] = []
        reasons: List[str] = []
        risk_level = self.TOOL_RISK.get(proposed_tool, "MEDIUM")
        tool_history = tool_history or []

        # Fallback if scope not yet extracted (should not happen with proper pipeline)
        if not scope:
            return ActionGuardDecision(
                decision="ASK_HUMAN",
                tool=proposed_tool,
                arguments=tool_arguments,
                risk_level="MEDIUM",
                violated_rules=["S003"],
                reason="No scope extracted from user request. Cannot verify authorization. Human confirmation required.",
                scope_match=False,
            )

        requested_actions = scope.get("requested_actions", [])
        inferred_actions = scope.get("inferred_actions", [])
        all_allowed_actions = set(requested_actions + inferred_actions)
        requested_resources = set(scope.get("requested_resources", []))
        requested_targets = set(scope.get("requested_targets", []))
        constraints = set(scope.get("constraints", []))
        explicit_authorizations = set(scope.get("explicit_authorizations", []))

        scope_match = True

        # ── Check 1: Tool in scope? (Rule T001) ────────────────────────
        if proposed_tool not in all_allowed_actions:
            # For LOW-risk tools, if the intent reasonably implies them, allow
            if risk_level == "LOW" and self._is_implicitly_allowed(proposed_tool, scope):
                reasons.append(f"Tool '{proposed_tool}' implicitly allowed by intent '{scope.get('intent')}'.")
            else:
                violated_rules.append("T001")
                reasons.append(f"Tool '{proposed_tool}' is NOT in the user's extracted scope.")
                scope_match = False

        # ── Check 2: Resource authorization (Rule T002) ─────────────────
        if proposed_tool == "read_file":
            target_file = tool_arguments.get("path", "")
            if target_file and requested_resources:
                file_norm = target_file.lower().strip()
                resource_norms = {r.lower().strip() for r in requested_resources}
                if file_norm not in resource_norms:
                    # Check if the file is implicitly allowed via inferred actions
                    auth_key = f"read_file:{target_file}"
                    if auth_key not in explicit_authorizations:
                        violated_rules.append("T002")
                        reasons.append(f"File '{target_file}' is not in user's requested resources.")
                        scope_match = False

            # Sensitive file check (Rule D001)
            if self._is_sensitive_resource(target_file):
                auth_key = f"read_file:{target_file}"
                if auth_key not in explicit_authorizations:
                    risk_level = self._escalate_risk(risk_level, "HIGH")
                    violated_rules.append("D001")
                    reasons.append(f"File '{target_file}' appears to contain sensitive data. Explicit authorization required.")

        # ── Check 3: Recipient authorization (Rule T003) ────────────────
        if proposed_tool == "send_email":
            recipient = tool_arguments.get("recipient", "")
            if recipient:
                if requested_targets:
                    if recipient.lower() not in {t.lower() for t in requested_targets}:
                        violated_rules.append("T003")
                        reasons.append(f"Recipient '{recipient}' is not authorized by user scope.")
                        scope_match = False
                else:
                    # No recipients specified in scope → external action needs explicit auth
                    violated_rules.append("X001")
                    reasons.append(f"No authorized recipients in scope. Recipient '{recipient}' requires human confirmation.")

        # ── Check 4: Explicit authorization for HIGH-risk tools (Rule R005/R006) ──
        if proposed_tool in self.EXPLICIT_AUTH_TOOLS:
            if proposed_tool not in requested_actions:
                # User didn't explicitly request this action
                risk_level = self._escalate_risk(risk_level, "HIGH")
                if "R006" not in violated_rules:
                    violated_rules.append("R006")
                    reasons.append(f"Tool '{proposed_tool}' is a high-risk external action requiring explicit user authorization.")
                    scope_match = False

        # ── Check 5: Constraint violations ──────────────────────────────
        constraint_map = {
            "no_modification": ["write_record"],
            "no_external_communication": ["send_email"],
            "no_web_search": ["search_web"],
        }
        for constraint, blocked_tools in constraint_map.items():
            if constraint in constraints and proposed_tool in blocked_tools:
                violated_rules.append("S001")
                reasons.append(f"User constraint '{constraint}' explicitly prohibits tool '{proposed_tool}'.")
                scope_match = False
                risk_level = self._escalate_risk(risk_level, "HIGH")

        # ── Check 6: Multi-step attack detection (Rule M003/M004) ───────
        if tool_history:
            chain_risk = self._check_tool_chain(proposed_tool, tool_arguments, tool_history, scope)
            if chain_risk:
                violated_rules.extend(chain_risk["rules"])
                reasons.append(chain_risk["reason"])
                risk_level = self._escalate_risk(risk_level, chain_risk["risk"])

        # ── Final decision ──────────────────────────────────────────────
        decision = self._compute_decision(violated_rules, risk_level, scope_match)

        return ActionGuardDecision(
            decision=decision,
            tool=proposed_tool,
            arguments=tool_arguments,
            risk_level=risk_level,
            violated_rules=violated_rules,
            reason=" | ".join(reasons) if reasons else f"Tool '{proposed_tool}' is within authorized scope.",
            scope_match=scope_match,
        )

    def _is_implicitly_allowed(self, tool: str, scope: Dict[str, Any]) -> bool:
        """Check if a tool is implicitly allowed by the user's intent."""
        intent = scope.get("intent", "")
        implicit_map = {
            "vendor_comparison": {"read_file", "search_web"},
            "read_document": {"read_file"},
            "summarize_content": {"read_file"},
            "web_search": {"search_web"},
            "general_information_request": {"search_web", "read_file"},
        }
        return tool in implicit_map.get(intent, set())

    def _is_sensitive_resource(self, path: str) -> bool:
        """Check if a file path contains sensitive data indicators."""
        path_lower = (path or "").lower()
        return any(pattern in path_lower for pattern in self.SENSITIVE_FILE_PATTERNS)

    def _escalate_risk(self, current: str, proposed: str) -> str:
        """Return the higher of two risk levels."""
        levels = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
        if levels.get(proposed, 0) > levels.get(current, 0):
            return proposed
        return current

    def _check_tool_chain(
        self,
        proposed_tool: str,
        tool_arguments: Dict[str, Any],
        tool_history: List[Dict[str, Any]],
        scope: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Detect multi-step attack patterns (Section 15: M001-M005)."""
        executed_tools = [h.get("tool") for h in tool_history]

        # M004: Cross-tool exfiltration detection (read → send pattern)
        if proposed_tool == "send_email" and "read_file" in executed_tools:
            # Check if a confidential file was read and is now being emailed
            read_calls = [h for h in tool_history if h.get("tool") == "read_file"]
            sensitive_reads = [
                h for h in read_calls
                if self._is_sensitive_resource(h.get("arguments", {}).get("path", ""))
            ]
            if sensitive_reads:
                return {
                    "rules": ["M004", "D004"],
                    "reason": "CROSS-TOOL EXFILTRATION: Sensitive file was read, now attempting to email externally. This is a prohibited data flow.",
                    "risk": "CRITICAL",
                }

        # M003: Privilege escalation (low-risk → high-risk transition)
        if proposed_tool in self.EXPLICIT_AUTH_TOOLS:
            low_risk_history = [t for t in executed_tools if self.TOOL_RISK.get(t, "MEDIUM") == "LOW"]
            if low_risk_history and proposed_tool not in scope.get("requested_actions", []):
                return {
                    "rules": ["M003"],
                    "reason": f"PRIVILEGE ESCALATION: Transitioning from low-risk tool(s) {low_risk_history} to high-risk '{proposed_tool}' without explicit authorization.",
                    "risk": "HIGH",
                }

        # T005: Tool chain escalation (a previously allowed tool cannot authorize another)
        if len(executed_tools) >= 3:
            return {
                "rules": ["T005"],
                "reason": f"TOOL CHAIN WARNING: {len(executed_tools)} tools already executed. Each additional tool is independently evaluated.",
                "risk": "MEDIUM",
            }

        return None

    def _compute_decision(
        self, violated_rules: List[str], risk_level: str, scope_match: bool
    ) -> str:
        """Compute final ALLOW/BLOCK/ASK_HUMAN decision."""
        if not violated_rules and scope_match:
            return "ALLOW"

        # Critical violations → BLOCK
        critical_rules = {"M004", "D004", "D001", "D003", "D005"}
        if any(r in critical_rules for r in violated_rules):
            return "BLOCK"

        # High-risk + out-of-scope → BLOCK
        if risk_level in ("HIGH", "CRITICAL") and not scope_match:
            return "BLOCK"

        # Medium violations → ASK_HUMAN
        ambiguous_rules = {"X001", "S003", "T005", "M003"}
        if any(r in ambiguous_rules for r in violated_rules):
            return "ASK_HUMAN"

        # Low-risk out-of-scope → ASK_HUMAN
        if not scope_match:
            return "ASK_HUMAN"

        return "ALLOW"


# Global singleton
action_guard = ActionGuard()
