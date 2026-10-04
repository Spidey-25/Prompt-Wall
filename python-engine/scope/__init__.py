"""
Scope Extractor package (Stage 7).
"""

from scope.models import TaskScope, ScopeExtractRequest, ScopeExtractResponse
from scope.extractor import ScopeExtractor, scope_extractor

__all__ = [
    "TaskScope",
    "ScopeExtractRequest",
    "ScopeExtractResponse",
    "ScopeExtractor",
    "scope_extractor",
]
