"""
Content Firewall Module (Stage 6 — AgentShield Rulebook Integration).

Implements the complete firewall security pipeline powered by the AgentShield Security Policy:
1. Normalization
2. Encoding Detection / Safe Decoding
3. Rulebook Policy Evaluation
4. Policy Decision (ALLOW / BLOCK / ASK_HUMAN / QUARANTINE / FLAG)
5. Sanitization & Quarantine
6. Safe Context output
"""

from typing import Any, Dict, List, Tuple
from security.decoder import detect_and_decode
from security.classifier import classify_text, analyze_content_ai, AIContentAnalysis
from security.sanitizer import sanitize_text
from security.rulebook import get_rulebook_version, get_rulebook_info


class ContentFirewall:
    """Stage 6 Content Firewall combining Rulebook evaluation with AI Semantic Content Analysis."""

    def inspect_text(self, content: str, source_id: str = "untrusted", user_request: str = "") -> Dict[str, Any]:
        """
        Execute full Content Safety pipeline:
            Raw Content → Normalization → Encoded Detection → Deterministic Rules → AI Semantic Analysis → Combined Decision
        """
        if not content or not isinstance(content, str):
            rb_info = get_rulebook_info()
            return {
                "rulebook_version": rb_info["version"],
                "rulebook_name": rb_info["name"],
                "status": "CLEAN",
                "classification": "BENIGN",
                "decision": "ALLOW",
                "severity": "LOW",
                "confidence": 1.0,
                "reason": "Empty content.",
                "matched_rules": [],
                "original_content": content or "",
                "sanitized_content": content or "",
                "detections": [],
                "decoded_payloads": [],
                "source_id": source_id,
                "ai_analysis": None,
            }

        # 1. Normalization & 2. Encoded Content Detection
        normalized_content, decoded_payloads = detect_and_decode(content)

        # 3. Deterministic Rulebook Evaluation
        classification_res = classify_text(normalized_content, decoded_payloads)

        # 4. AI Semantic Analyzer
        ai_analysis: AIContentAnalysis = analyze_content_ai(
            text=normalized_content,
            user_request=user_request,
            source_metadata={"source_id": source_id},
        )

        # 5. Combined Finding (Rule + AI combination)
        rule_class = classification_res.get("classification", "BENIGN")
        ai_class = ai_analysis.classification

        # UNTRUSTED CONTENT RULE: If either rulebook OR AI finds injection -> QUARANTINE / FLAG
        if rule_class in ("MALICIOUS", "SUSPICIOUS") or ai_class in ("PROMPT_INJECTION", "DATA_EXFILTRATION", "SUSPICIOUS"):
            classification = "PROMPT_INJECTION" if (rule_class == "MALICIOUS" or ai_class == "PROMPT_INJECTION") else "SUSPICIOUS"
            decision = "QUARANTINE" if (classification == "PROMPT_INJECTION") else "FLAG"
            severity = "CRITICAL" if decision == "QUARANTINE" else "HIGH"
            confidence = max(classification_res.get("confidence", 0.95), ai_analysis.confidence)
            reason = classification_res.get("reason") or ai_analysis.reason or "Adversarial prompt injection detected in retrieved content."
        else:
            classification = "BENIGN"
            decision = "ALLOW"
            severity = "LOW"
            confidence = min(classification_res.get("confidence", 1.0), ai_analysis.confidence)
            reason = "Content is clean. No prompt injection or policy violations detected."

        matched_rules = classification_res.get("matched_rules", [])
        detections = classification_res.get("detections", [])

        # 6. Sanitization / Quarantine
        sanitized = sanitize_text(normalized_content, classification_res, decoded_payloads)
        status = "QUARANTINED" if decision in ("QUARANTINE", "BLOCK") else "FLAGGED" if decision == "FLAG" else "CLEAN"

        return {
            "rulebook_version": classification_res.get("rulebook_version", get_rulebook_version()),
            "rulebook_name": classification_res.get("rulebook_name", "AgentShield Security Policy"),
            "status": status,
            "classification": classification,
            "decision": decision,
            "severity": severity,
            "confidence": confidence,
            "reason": reason,
            "matched_rules": matched_rules,
            "original_content": content,
            "sanitized_content": sanitized,
            "detections": detections,
            "decoded_payloads": decoded_payloads,
            "source_id": source_id,
        }

    def inspect_rag_results(
        self, retrieved_context: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Inspect and sanitize a list of RAG document chunks against the Rulebook.

        Returns:
            (sanitized_context, firewall_summary)
        """
        rb_info = get_rulebook_info()
        if not retrieved_context:
            return [], {
                "rulebook_version": rb_info["version"],
                "rulebook_name": rb_info["name"],
                "scanned_chunks": 0,
                "flagged_chunks": 0,
                "status": "CLEAN",
                "classification": "BENIGN",
                "decision": "ALLOW",
                "severity": "LOW",
                "confidence": 1.0,
                "matched_rules": [],
                "detections": [],
                "chunk_results": [],
            }

        sanitized_context: List[Dict[str, Any]] = []
        chunk_results: List[Dict[str, Any]] = []
        all_detections: List[Dict[str, Any]] = []
        all_matched_rules: List[str] = []
        flagged_count = 0

        for chunk in retrieved_context:
            source_id = chunk.get("source_id", "unknown")
            text = chunk.get("text", "")

            inspection = self.inspect_text(text, source_id=source_id)

            if inspection["status"] in ("QUARANTINED", "FLAGGED"):
                flagged_count += 1

            all_detections.extend(inspection["detections"])
            for r in inspection.get("matched_rules", []):
                if r not in all_matched_rules:
                    all_matched_rules.append(r)
            chunk_results.append(inspection)

            updated_chunk = dict(chunk)
            updated_chunk["text"] = inspection["sanitized_content"]
            updated_chunk["firewall_status"] = inspection["status"]
            sanitized_context.append(updated_chunk)

        if flagged_count > 0:
            highest_classification = (
                "PROMPT_INJECTION"
                if any(c["classification"] in ("MALICIOUS", "PROMPT_INJECTION") for c in chunk_results)
                else "SUSPICIOUS"
            )
            overall_decision = (
                "QUARANTINE"
                if any(c["decision"] == "QUARANTINE" for c in chunk_results)
                else "FLAG"
            )
            overall_status = "QUARANTINED" if overall_decision == "QUARANTINE" else "FLAGGED"
            max_confidence = max(c["confidence"] for c in chunk_results)
            overall_severity = "CRITICAL" if highest_classification in ("MALICIOUS", "PROMPT_INJECTION") else "HIGH"
            reason = next((c["reason"] for c in chunk_results if c["reason"]), "Policy violation detected.")
        else:
            highest_classification = "BENIGN"
            overall_decision = "ALLOW"
            overall_status = "CLEAN"
            max_confidence = 1.0
            overall_severity = "LOW"
            reason = "All retrieved RAG document context cleared Rulebook policy checks."

        firewall_summary = {
            "rulebook_version": rb_info["version"],
            "rulebook_name": rb_info["name"],
            "scanned_chunks": len(retrieved_context),
            "flagged_chunks": flagged_count,
            "status": overall_status,
            "classification": highest_classification,
            "decision": overall_decision,
            "severity": overall_severity,
            "confidence": max_confidence,
            "reason": reason,
            "matched_rules": all_matched_rules,
            "detections": all_detections,
            "chunk_results": chunk_results,
        }

        return sanitized_context, firewall_summary

    def inspect_tool_result(
        self, tool_name: str, tool_result: Any
    ) -> Tuple[Any, Dict[str, Any]]:
        """
        Inspect tool execution output against the Rulebook.

        Returns:
            (sanitized_tool_result, firewall_inspection)
        """
        rb_info = get_rulebook_info()
        if not isinstance(tool_result, dict):
            return tool_result, {
                "rulebook_version": rb_info["version"],
                "status": "CLEAN",
                "classification": "BENIGN",
                "decision": "ALLOW",
            }

        inspection = None
        updated_result = dict(tool_result)

        if tool_name == "read_file" and "content" in updated_result:
            file_content = updated_result["content"]
            inspection = self.inspect_text(file_content, source_id=f"tool:{tool_name}")
            updated_result["content"] = inspection["sanitized_content"]
            updated_result["firewall_status"] = inspection["status"]

        elif tool_name == "search_web" and "results" in updated_result:
            results_list = updated_result.get("results", [])
            sanitized_items = []
            for item in results_list:
                snippet = item.get("snippet", "")
                insp = self.inspect_text(snippet, source_id=f"tool:{tool_name}")
                item_copy = dict(item)
                item_copy["snippet"] = insp["sanitized_content"]
                sanitized_items.append(item_copy)
                if insp["status"] in ("QUARANTINED", "FLAGGED") and inspection is None:
                    inspection = insp
            updated_result["results"] = sanitized_items

        if inspection is None:
            inspection = {
                "rulebook_version": rb_info["version"],
                "rulebook_name": rb_info["name"],
                "status": "CLEAN",
                "classification": "BENIGN",
                "decision": "ALLOW",
                "confidence": 1.0,
                "reason": "Tool result clean.",
                "matched_rules": [],
                "detections": [],
            }

        return updated_result, inspection


# Global singleton instance
content_firewall = ContentFirewall()
