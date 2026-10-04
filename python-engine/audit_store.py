import json
import os
import threading
from typing import Any, Dict, List


_lock = threading.Lock()
_path = os.path.join(os.path.dirname(__file__), "data", "audit_events.jsonl")


def append_events(events: List[Dict[str, Any]]) -> None:
    if not events:
        return
    os.makedirs(os.path.dirname(_path), exist_ok=True)
    with _lock, open(_path, "a", encoding="utf-8") as handle:
        for event in events:
            handle.write(json.dumps(event, ensure_ascii=True) + "\n")


def get_events(limit: int = 500) -> List[Dict[str, Any]]:
    if not os.path.exists(_path):
        return []
    with _lock, open(_path, "r", encoding="utf-8") as handle:
        lines = handle.readlines()[-limit:]
    events: List[Dict[str, Any]] = []
    for line in reversed(lines):
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return events
