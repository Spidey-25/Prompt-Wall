"""
Safe Mock read_file tool.
Restricted to reading files inside data/mock_files/ sandbox directory.
Prevents path traversal attacks.
Handles .txt, .pdf, .csv, .md, .json and binary files safely.
"""

import os
import re
from typing import Any, Dict

_SANDBOX_DIR = os.path.realpath(
    os.path.join(os.path.dirname(__file__), "..", "data", "mock_files")
)


def read_file(path: str) -> Dict[str, Any]:
    """
    Safely read a file from the mock_files sandbox directory.

    Args:
        path: Name or relative path of the file to read.

    Returns:
        Structured response dictionary.
    """
    os.makedirs(_SANDBOX_DIR, exist_ok=True)

    raw_path = (path or "").strip()
    if not raw_path:
        return {
            "success": False,
            "error": "INVALID_PATH",
            "message": "Path cannot be empty.",
            "path": path,
        }

    # Resolve real path relative to sandbox directory
    target_path = os.path.realpath(os.path.join(_SANDBOX_DIR, raw_path))

    # Strict sandbox boundary check (Path traversal protection)
    if not target_path.startswith(_SANDBOX_DIR + os.sep) and target_path != _SANDBOX_DIR:
        return {
            "success": False,
            "error": "PATH_TRAVERSAL_DENIED",
            "message": f"Access denied: '{path}' escapes the sandbox directory.",
            "path": path,
        }

    # If exact path doesn't exist, attempt normalized matching (e.g. house1.pdf -> house-1.pdf)
    if not os.path.exists(target_path) or not os.path.isfile(target_path):
        target_norm = re.sub(r"[^a-zA-Z0-9]", "", os.path.basename(raw_path)).lower()
        matched_file = None
        if os.path.exists(_SANDBOX_DIR):
            for existing in os.listdir(_SANDBOX_DIR):
                existing_norm = re.sub(r"[^a-zA-Z0-9]", "", existing).lower()
                if target_norm == existing_norm:
                    matched_file = existing
                    break
        if matched_file:
            target_path = os.path.join(_SANDBOX_DIR, matched_file)
        else:
            return {
                "success": False,
                "error": "FILE_NOT_FOUND",
                "message": f"File '{os.path.basename(raw_path)}' was not found in mock_files sandbox.",
                "path": path,
            }

    try:
        with open(target_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        # If file is binary/pdf or contains unprintable null bytes, extract readable text
        if not content.strip() or any(ord(c) == 0 for c in content[:100]):
            with open(target_path, "rb") as f:
                raw_bytes = f.read()
            printable = re.findall(rb"[\x20-\x7e\t\r\n]{4,}", raw_bytes)
            extracted = "\n".join(p.decode("ascii", errors="ignore") for p in printable)
            content = extracted if extracted.strip() else f"[Document content from {os.path.basename(target_path)}]"

        return {
            "success": True,
            "path": os.path.basename(target_path),
            "content": content,
        }
    except Exception as exc:
        return {
            "success": False,
            "error": "READ_ERROR",
            "message": str(exc),
            "path": path,
        }
