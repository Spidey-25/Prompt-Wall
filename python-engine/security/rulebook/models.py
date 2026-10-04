"""
Typed Data Models for AgentShield Security Policy (Stage 6 Rulebook).

Reflects the exact structure and terminology of the official AgentShield Security Policy.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PolicyMetadata(BaseModel):
    name: str = "AgentShield Security Policy"
    version: str = "1.0"
    environment: str = "sandbox"
    default_decision: str = "ASK_HUMAN"
    fail_closed_for_sensitive_actions: bool = True


class TrustSourceConfig(BaseModel):
    classification: str  # "trusted" | "untrusted" | "derived"
    authority: str       # "highest" | "high" | "limited" | "none"
    can_define_task: bool = False
    can_define_scope: bool = False
    can_authorize_tools: bool = False
    can_authorize_recipients: bool = False
    can_authorize_data_access: bool = False
    can_authorize_external_actions: bool = False
    can_provide_information: bool = True
    can_expand_scope: bool = False


class RuleDefinition(BaseModel):
    name: str
    severity: str = "HIGH"  # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    rule: List[str] = Field(default_factory=list)
    decision: Dict[str, Any] = Field(default_factory=dict)


class PromptInjectionCategory(BaseModel):
    examples: List[str] = Field(default_factory=list)
    detection: List[str] = Field(default_factory=list)
    classification: str = "suspicious"  # "suspicious" | "malicious" | "malicious_when_unauthorized"
    action: str = "FLAG"               # "FLAG" | "QUARANTINE" | "BLOCK"


class InstructionPriority(BaseModel):
    source: str
    trust: str
    authority: str


class RulebookPolicy(BaseModel):
    metadata: PolicyMetadata
    trust: Dict[str, TrustSourceConfig]
    fundamental_rules: Dict[str, RuleDefinition]
    prompt_injection: Dict[str, Any]
    instruction_hierarchy: Dict[str, Any]
    encoded_content: Dict[str, Any]
    hidden_content: Dict[str, Any]
    untrusted_instructions: Dict[str, Any]
    scope_engine: Dict[str, Any]
    tool_security: Dict[str, Any]
    sensitive_data: Dict[str, Any]
    external_actions: Dict[str, Any]
    provenance: Dict[str, Any]
    tool_output: Dict[str, Any]
    authority_impersonation: Dict[str, Any]
    multi_step: Dict[str, Any]
    classification: Dict[str, Any]
    decision_engine: Dict[str, Any]
    fail_safe: Dict[str, Any]
    task_continuity: Dict[str, Any]
    audit: Dict[str, Any]
    risk: Dict[str, Any]
    final_rule: Dict[str, Any]
