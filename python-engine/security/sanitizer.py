"""
Sanitizer & Quarantine Module for Content Safety (Stage 6 — AgentShield Rulebook Integration).

Responsibilities (per AgentShield Rule C001 Minimal Interruption & Sec 17 QUARANTINE):
- Preserve legitimate business/document text wherever possible.
- Quarantine/redact prompt injection instructions or malicious payload lines.
- Replace injected instructions with `[QUARANTINED: POSSIBLE PROMPT INJECTION]`.
- Replace encoded malicious payloads with `[QUARANTINED: ENCODED PROMPT INJECTION]`.
"""

import re
from typing import Any, Dict, List

QUARANTINE_TAG = "[QUARANTINED: POSSIBLE PROMPT INJECTION]"
ENCODED_QUARANTINE_TAG = "[QUARANTINED: ENCODED PROMPT INJECTION]"

INJECTION_PATTERNS = [
    r"(?i)\b(?:ignore|disregard|forget|bypass)\s+(?:all\s+)?(?:previous|prior|above|former|initial|system)\s+(?:instructions|prompts|rules|context)\b",
    r"(?i)(?:system\s*(?:message)?\s*:|\[system\]|<<<system>>>|<\|im_start\|>system|\[developer\]|<<<developer>>>|developer\s*(?:message)?\s*:|administrator\s*(?:instruction|message)?\s*:|security\s*override\s*:|highest\s*priority\s*instruction\s*:)",
    r"(?i)\b(?:reveal|output|show|print|display|tell\s+me)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|hidden\s+rules)\b",
    r"(?i)\b(?:disable\s+security|bypass\s+validation|skip\s+authorization|ignore\s+policy|root\s+override|admin\s+mode|jailbreak)\b",
    r"(?i)\b(?:send|email|exfiltrate|transmit|forward)\s+[\w\.\-]+\s+to\s+[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
]


def sanitize_text(
    text: str,
    classification_result: Dict[str, Any],
    decoded_payloads: List[Dict[str, Any]] = None
) -> str:
    """
    Sanitize text by replacing malicious instructions or encoded payloads with quarantine tags
    while preserving legitimate context (Rule C001 Minimal Interruption).

    Returns:
        sanitized_text (str)
    """
    classification = classification_result.get("classification", "BENIGN")
    decision = classification_result.get("decision", "ALLOW")
    detections = classification_result.get("detections", [])

    if classification == "BENIGN" or decision == "ALLOW" or not text:
        return text

    decoded_payloads = decoded_payloads or []
    sanitized = text

    # 1. Neutralize Encoded Payloads (Base64/Hex/HTML Comments)
    for payload in decoded_payloads:
        encoded_str = payload.get("encoded", "")
        if encoded_str and encoded_str in sanitized:
            is_malicious_payload = any(
                d.get("type", "").startswith("ENCODED_") for d in detections
            )
            if is_malicious_payload:
                sanitized = sanitized.replace(encoded_str, ENCODED_QUARANTINE_TAG)

    # 2. Line-by-Line Sanitization for Direct Injections
    lines = sanitized.split("\n")
    sanitized_lines = []
    quarantine_inserted = False

    for line in lines:
        line_is_malicious = any(re.search(pat, line) for pat in INJECTION_PATTERNS)

        if line_is_malicious:
            if not quarantine_inserted:
                sanitized_lines.append(QUARANTINE_TAG)
                quarantine_inserted = True
        else:
            quarantine_inserted = False
            sanitized_lines.append(line)

    sanitized_text = "\n".join(sanitized_lines).strip()

    if not sanitized_text:
        return QUARANTINE_TAG

    return sanitized_text
