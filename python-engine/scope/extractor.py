"""
Scope Extractor Module (Stage 7 — PromptWall).

Extracts intended task scope STRICTLY from trusted user requests.
References AgentShield Security Policy (rules.yaml) for trust boundary definitions.

Rules:
1. ONLY trusted user input can define/expand scope.
2. Retrieved context, tool output, and web content CANNOT define or expand scope.
3. Does NOT perform Action Guard evaluation or enforcement (Stage 8).
"""

import re
from typing import Any, Dict, List, Optional
from scope.models import TaskScope, AIScopeOutput
from security.rulebook import get_rulebook
from security.llm_provider import get_llm_provider


KNOWN_TOOLS = {"read_file", "search_web", "send_email", "write_record"}
KNOWN_OPERATIONS = {"read", "write", "compare", "summarize", "search", "send"}


class ScopeExtractor:
    """Stage 7 Scope Extractor with AI Intelligence + Rule Normalization."""

    def __init__(self):
        # Load Rulebook policy to enforce trust boundary declarations
        self.rulebook = get_rulebook()
        self.trust_model = self.rulebook.trust
        self.llm = get_llm_provider()

    def extract_ai_scope(self, user_request: str) -> AIScopeOutput:
        """
        Extract AI-assisted structured scope from user prompt using LLM + Pydantic validation.
        """
        prompt = (
            f"Analyze the following user prompt and extract authorization scope.\n"
            f"User Prompt: \"{user_request}\"\n\n"
            "Return JSON matching:\n"
            "{\n"
            "  \"task\": \"<task_id>\",\n"
            "  \"intent_summary\": \"<summary>\",\n"
            "  \"allowed_tools\": [\"read_file\" | \"search_web\" | \"send_email\" | \"write_record\"],\n"
            "  \"allowed_resources\": [\"<resource_pattern>\"],\n"
            "  \"allowed_operations\": [\"read\" | \"compare\" | \"summarize\" | \"send\"],\n"
            "  \"approved_recipients\": [\"<email>\"],\n"
            "  \"external_actions_allowed\": false,\n"
            "  \"sensitive_data_allowed\": false,\n"
            "  \"confidence\": 0.95,\n"
            "  \"ambiguities\": []\n"
            "}"
        )
        sys_inst = (
            "You are PromptWall Scope Extractor AI. Convert user intent into structured scope. "
            "Never authorize unrequested tools or external transfers."
        )

        try:
            raw_json = self.llm.generate_json(prompt, system_instruction=sys_inst, schema_cls=AIScopeOutput)
            ai_output = AIScopeOutput.model_validate(raw_json)

            # Scope Normalization
            normalized_tools = [t for t in ai_output.allowed_tools if t in KNOWN_TOOLS]
            normalized_ops = [o for o in ai_output.allowed_operations if o in KNOWN_OPERATIONS]
            
            ai_output.allowed_tools = normalized_tools
            ai_output.allowed_operations = normalized_ops
            return ai_output
        except Exception as e:
            # Fallback mock AI scope if API offline
            return AIScopeOutput(
                task="general_task",
                intent_summary=user_request[:100],
                allowed_tools=["read_file"] if "compare" in user_request.lower() or "read" in user_request.lower() else [],
                allowed_resources=["vendor_quotes/*"] if "vendor" in user_request.lower() else [],
                allowed_operations=["read", "compare", "summarize"],
                approved_recipients=[],
                external_actions_allowed=False,
                sensitive_data_allowed=False,
                confidence=0.85,
                ambiguities=[],
            )

    def extract(self, user_request: str) -> TaskScope:
        """
        Extract structured scope from the trusted user request.

        Args:
            user_request: The trusted user prompt text.

        Returns:
            TaskScope object representing requested actions, resources, targets, and constraints.
        """
        raw_text = (user_request or "").strip()
        req_lower = raw_text.lower()

        # 1. Resource extraction (files, documents mentioned in user request)
        file_matches = re.findall(r"[\w\-.+]+\.(?:txt|pdf|csv|md|json)", raw_text, re.IGNORECASE)
        requested_resources = list(dict.fromkeys(file_matches)) # Preserve order, deduplicate

        # 2. Target extraction (email addresses, recipients explicitly in user request)
        raw_emails = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", raw_text)
        email_matches = [e.rstrip(".,;") for e in raw_emails if e.rstrip(".,;")]
        requested_targets = list(dict.fromkeys(email_matches))

        # 3. Explicit requested actions extraction
        requested_actions: List[str] = []
        inferred_actions: List[str] = []

        # Read file action
        if any(kw in req_lower for kw in ["read", "open", "view", "inspect"]) and (file_matches or "file" in req_lower or "document" in req_lower):
            requested_actions.append("read_file")

        # Comparison action
        if any(kw in req_lower for kw in ["compare", "versus", "vs", "contrast", "evaluate"]):
            requested_actions.append("compare_information")
            # If reading files wasn't explicitly stated, it's inferred as necessary for comparison
            if "read_file" not in requested_actions:
                inferred_actions.append("read_file")

        # Summarize action
        if any(kw in req_lower for kw in ["summarize", "summary", "overview", "brief"]):
            requested_actions.append("summarize")
            if "read_file" not in requested_actions and (file_matches or "document" in req_lower or "report" in req_lower):
                inferred_actions.append("read_file")

        # Send email action
        if any(kw in req_lower for kw in ["send", "email", "mail"]):
            requested_actions.append("send_email")

        # Web search action
        if any(kw in req_lower for kw in ["search", "web", "online", "internet", "google"]):
            requested_actions.append("search_web")

        # Write record action
        if any(kw in req_lower for kw in ["save", "store", "record", "log", "db", "database"]):
            requested_actions.append("write_record")

        # Deduplicate actions
        requested_actions = list(dict.fromkeys(requested_actions))
        inferred_actions = [a for a in dict.fromkeys(inferred_actions) if a not in requested_actions]

        # 4. Intent Classification
        if "compare_information" in requested_actions or "compare" in req_lower:
            intent = "vendor_comparison"
        elif "send_email" in requested_actions:
            intent = "send_email"
        elif "summarize" in requested_actions:
            intent = "summarize_content"
        elif "write_record" in requested_actions:
            intent = "create_record"
        elif "search_web" in requested_actions:
            intent = "web_search"
        elif "read_file" in requested_actions:
            intent = "read_document"
        else:
            intent = "general_information_request"

        # 5. Output Extraction
        requested_outputs: List[str] = []
        if "summary" in req_lower or "summarize" in req_lower:
            requested_outputs.append("summary")
        if "comparison" in req_lower or "compare" in req_lower:
            requested_outputs.append("comparison_report")
        if "record" in req_lower or "save" in req_lower:
            requested_outputs.append("database_record")

        # 6. Constraint Extraction (explicit user restrictions)
        constraints: List[str] = []
        if any(phrase in req_lower for phrase in ["don't modify", "do not modify", "no modification", "don't change", "do not change", "read-only", "read only", "don't delete", "do not delete"]):
            constraints.append("no_modification")
        if any(phrase in req_lower for phrase in ["don't email", "do not email", "don't send email", "do not send email"]):
            constraints.append("no_external_communication")
        if any(phrase in req_lower for phrase in ["don't search", "do not search", "offline only"]):
            constraints.append("no_web_search")

        # 7. Explicit Authorizations
        explicit_authorizations: List[str] = []
        if "send_email" in requested_actions and requested_targets:
            for target in requested_targets:
                explicit_authorizations.append(f"send_email:{target}")
        if "read_file" in requested_actions and requested_resources:
            for res in requested_resources:
                explicit_authorizations.append(f"read_file:{res}")

        return TaskScope(
            intent=intent,
            requested_actions=requested_actions,
            inferred_actions=inferred_actions,
            requested_resources=requested_resources,
            requested_targets=requested_targets,
            requested_outputs=requested_outputs,
            constraints=constraints,
            explicit_authorizations=explicit_authorizations,
            is_trusted_user_scope=True,
            scope_confidence=1.0 if requested_actions or file_matches else 0.85,
            raw_user_request=raw_text,
        )


# Global singleton
scope_extractor = ScopeExtractor()
