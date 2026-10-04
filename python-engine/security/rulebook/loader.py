"""
Rulebook Loader Module for AgentShield Security Policy (Stage 6).

Loads, validates, and exposes the centralized machine-readable rules.yaml policy.
Ensures Rulebook is the SINGLE SOURCE OF TRUTH for all security decisions.
"""

import os
import yaml
from typing import Any, Dict, Optional
from security.rulebook.models import RulebookPolicy, PolicyMetadata


_DEFAULT_RULEBOOK_PATH = os.path.realpath(
    os.path.join(os.path.dirname(__file__), "rules.yaml")
)

_rulebook_instance: Optional[RulebookPolicy] = None


class RulebookLoadError(Exception):
    """Raised when the Rulebook YAML is missing, unparseable, or fails schema validation."""
    pass


def load_rulebook(path: Optional[str] = None) -> RulebookPolicy:
    """
    Load, parse, and validate the official AgentShield Content Safety Rulebook.

    Raises:
        RulebookLoadError if file is missing, invalid YAML, or fails schema validation.
    """
    target_path = path or _DEFAULT_RULEBOOK_PATH

    if not os.path.exists(target_path):
        raise RulebookLoadError(f"Centralized Content Safety Rulebook not found at path: {target_path}")

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            raw_data = yaml.safe_load(f)
    except Exception as exc:
        raise RulebookLoadError(f"Failed to parse Rulebook YAML: {exc}")

    if not raw_data or "agentshield_policy" not in raw_data:
        raise RulebookLoadError("Rulebook is malformed: missing top-level key 'agentshield_policy'.")

    policy_dict = raw_data["agentshield_policy"]

    try:
        policy = RulebookPolicy(**policy_dict)
    except Exception as exc:
        raise RulebookLoadError(f"Rulebook schema validation failed: {exc}")

    return policy


def get_rulebook(path: Optional[str] = None) -> RulebookPolicy:
    """Singleton getter for the loaded Rulebook instance."""
    global _rulebook_instance
    if _rulebook_instance is None:
        _rulebook_instance = load_rulebook(path)
    return _rulebook_instance


def get_rulebook_version() -> str:
    """Return current loaded Rulebook version string (e.g. '1.0')."""
    rb = get_rulebook()
    return rb.metadata.version


def get_rulebook_info() -> Dict[str, Any]:
    """Expose Rulebook metadata & version overview for API and audit logging."""
    rb = get_rulebook()
    return {
        "name": rb.metadata.name,
        "version": rb.metadata.version,
        "environment": rb.metadata.environment,
        "default_decision": rb.metadata.default_decision,
        "rule_count": len(rb.fundamental_rules),
        "fundamental_rule_ids": list(rb.fundamental_rules.keys()),
        "trust_sources": list(rb.trust.keys()),
    }
