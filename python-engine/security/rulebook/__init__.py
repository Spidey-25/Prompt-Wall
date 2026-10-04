"""
Rulebook Package initialization.
Exposes loader, models, and singleton getter for AgentShield Security Policy.
"""

from security.rulebook.loader import (
    load_rulebook,
    get_rulebook,
    get_rulebook_version,
    get_rulebook_info,
    RulebookLoadError,
)
from security.rulebook.models import RulebookPolicy

__all__ = [
    "load_rulebook",
    "get_rulebook",
    "get_rulebook_version",
    "get_rulebook_info",
    "RulebookLoadError",
    "RulebookPolicy",
]
