"""
Decoder and Normalizer for Content Firewall (Stage 6).

Handles:
- Unicode normalization and zero-width character stripping
- HTML comment / hidden element extraction
- Safe detection and decoding of Base64 and Hexadecimal encoded strings
"""

import base64
import re
import unicodedata
from typing import Any, Dict, List, Tuple


ZERO_WIDTH_CHARS = [
    "\u200b",  # Zero-width space
    "\u200c",  # Zero-width non-joiner
    "\u200d",  # Zero-width joiner
    "\ufeff",  # Zero-width no-break space (BOM)
    "\u200e",  # Left-to-right mark
    "\u200f",  # Right-to-left mark
]

# Regex patterns for encoded content detection
HEX_PATTERN = re.compile(r"\b(?:[0-9a-fA-F]{2}){12,}\b")
BASE64_PATTERN = re.compile(
    r"(?:[A-Za-z0-9+/]{4}){4,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?"
)
HTML_COMMENT_PATTERN = re.compile(r"<!--(.*?)-->", re.DOTALL)


def normalize_text(text: str) -> str:
    """
    Normalize untrusted content before analysis.
    - Strip zero-width and non-printable control characters
    - Normalize Unicode forms (NFKC)
    - Collapse excessive trailing whitespace while preserving structure
    """
    if not text:
        return ""

    # Strip zero-width characters
    for char in ZERO_WIDTH_CHARS:
        text = text.replace(char, "")

    # Normalize Unicode (compatibility decomposition + canonical composition)
    text = unicodedata.normalize("NFKC", text)

    # Replace unusual control characters (keep \n, \r, \t)
    cleaned_chars = []
    for char in text:
        code = ord(char)
        if code < 32 and char not in ("\n", "\r", "\t"):
            cleaned_chars.append(" ")
        else:
            cleaned_chars.append(char)

    return "".join(cleaned_chars)


def extract_html_hidden_content(text: str) -> List[str]:
    """Extract hidden comments from HTML-like text for security inspection."""
    matches = HTML_COMMENT_PATTERN.findall(text)
    return [m.strip() for m in matches if m.strip()]


def is_hex_string(s: str) -> bool:
    """Return True if string consists strictly of hex digits and has even length."""
    return len(s) >= 12 and len(s) % 2 == 0 and all(c in "0123456789abcdefABCDEF" for c in s)


def detect_and_decode(text: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Detect and safely decode encoded content (Base64 / Hex).
    Returns:
        (normalized_text, decoded_payloads)
    Where decoded_payloads is a list of dicts:
        {"encoding": "base64"|"hex"|"html_comment", "encoded": str, "decoded": str}
    """
    normalized = normalize_text(text)
    decoded_payloads: List[Dict[str, Any]] = []
    processed_spans = set()

    # 1. Hexadecimal Detection & Safe Decoding (Check first to avoid base64 collision)
    for match in HEX_PATTERN.finditer(normalized):
        hex_str = match.group(0)
        if is_hex_string(hex_str):
            try:
                decoded_bytes = bytes.fromhex(hex_str)
                decoded_str = decoded_bytes.decode("utf-8", errors="ignore").strip()
                if len(decoded_str) >= 6 and any(c.isalpha() for c in decoded_str):
                    decoded_payloads.append(
                        {
                            "encoding": "hex",
                            "encoded": hex_str,
                            "decoded": decoded_str,
                        }
                    )
                    processed_spans.add(match.span())
            except Exception:
                pass

    # 2. Base64 Detection & Safe Decoding
    for match in BASE64_PATTERN.finditer(normalized):
        if match.span() in processed_spans:
            continue
        encoded_str = match.group(0)
        if len(encoded_str) < 16:
            continue
        # Skip if it's pure hex (already handled)
        if is_hex_string(encoded_str):
            continue
        try:
            decoded_bytes = base64.b64decode(encoded_str, validate=True)
            decoded_str = decoded_bytes.decode("utf-8", errors="ignore").strip()
            if len(decoded_str) >= 6 and any(c.isalpha() for c in decoded_str):
                decoded_payloads.append(
                    {
                        "encoding": "base64",
                        "encoded": encoded_str,
                        "decoded": decoded_str,
                    }
                )
        except Exception:
            pass

    # 3. HTML Comment Inspection
    comments = extract_html_hidden_content(normalized)
    for comment in comments:
        decoded_payloads.append(
            {
                "encoding": "html_comment",
                "encoded": f"<!--{comment}-->",
                "decoded": comment,
            }
        )

    return normalized, decoded_payloads
