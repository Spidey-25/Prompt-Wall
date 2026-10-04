"""
Pydantic models for Stage 7 — Scope Extractor.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TaskScope(BaseModel):
    """
    Structured representation of the requested user scope.
    Determined strictly from trusted user requests.
    """
    intent: str = Field(description="Primary user intent (e.g. vendor_comparison, read_document, summarize, send_email, write_record)")
    requested_actions: List[str] = Field(default_factory=list, description="Explicitly requested action identifiers")
    inferred_actions: List[str] = Field(default_factory=list, description="Actions inferred as necessary to fulfill explicit intent")
    requested_resources: List[str] = Field(default_factory=list, description="Target filenames or resources explicitly named in user prompt")
    requested_targets: List[str] = Field(default_factory=list, description="Target recipients or destinations explicitly named in user prompt")
    requested_outputs: List[str] = Field(default_factory=list, description="Requested output formats or records")
    constraints: List[str] = Field(default_factory=list, description="Explicit restrictions or limitations stated by user (e.g., no_modification)")
    explicit_authorizations: List[str] = Field(default_factory=list, description="Explicit user permissions granted in prompt")
    is_trusted_user_scope: bool = Field(default=True, description="Always True since derived strictly from user request, never untrusted content")
    scope_confidence: float = Field(default=1.0, description="Confidence score between 0.0 and 1.0")
    raw_user_request: str = Field(default="", description="The exact user prompt evaluated")


class AIScopeOutput(BaseModel):
    """Structured Pydantic model for AI-extracted scope."""
    task: str = Field(default="general_task", description="Extracted task identifier")
    intent_summary: str = Field(default="", description="Summary of user intent")
    allowed_tools: List[str] = Field(default_factory=list, description="Authorized tools")
    allowed_resources: List[str] = Field(default_factory=list, description="Authorized resource patterns")
    allowed_operations: List[str] = Field(default_factory=list, description="Authorized operations")
    approved_recipients: List[str] = Field(default_factory=list, description="Authorized recipient emails or endpoints")
    external_actions_allowed: bool = Field(default=False, description="Whether external transfer is allowed")
    sensitive_data_allowed: bool = Field(default=False, description="Whether sensitive data access is allowed")
    confidence: float = Field(default=0.95, description="AI extraction confidence score")
    ambiguities: List[str] = Field(default_factory=list, description="Extracted ambiguities or unclear elements")


class ScopeExtractRequest(BaseModel):
    message: str


class ScopeExtractResponse(BaseModel):
    success: bool
    scope: TaskScope
    ai_scope: Optional[AIScopeOutput] = None

