"""
Safe Mock write_record tool.
Simulates writing structured database records into data/mock_records/.
Does not modify real external databases.
"""

import json
import os
import time
import uuid
from typing import Any, Dict

_MOCK_RECORDS_DIR = os.path.realpath(
    os.path.join(os.path.dirname(__file__), "..", "data", "mock_records")
)


def write_record(record_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Safely store a structured record into the mock_records directory.

    Args:
        record_type: Type/table of record (e.g. 'vendor_comparison').
        data: Arbitrary dictionary data to store.

    Returns:
        Structured response dictionary containing record_id.
    """
    os.makedirs(_MOCK_RECORDS_DIR, exist_ok=True)

    record_id = f"rec_{uuid.uuid4().hex[:8]}"
    filename = f"{record_type}_{record_id}.json"
    file_path = os.path.join(_MOCK_RECORDS_DIR, filename)

    payload = {
        "record_id": record_id,
        "record_type": record_type,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "data": data,
        "mock": True,
    }

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

        return {
            "success": True,
            "record_id": record_id,
            "record_type": record_type,
            "mock": True,
            "saved_file": filename,
        }
    except Exception as exc:
        return {
            "success": False,
            "error": "RECORD_WRITE_ERROR",
            "message": str(exc),
        }
