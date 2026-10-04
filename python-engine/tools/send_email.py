"""
Safe Mock send_email tool.
Simulates sending an email by storing the payload in data/mock_emails/.
NEVER sends real emails or connects to external SMTP servers.
"""

import json
import os
import time
from typing import Any, Dict, Optional

_MOCK_EMAILS_DIR = os.path.realpath(
    os.path.join(os.path.dirname(__file__), "..", "data", "mock_emails")
)


def send_email(
    recipient: str,
    subject: str,
    body: str,
    attachment: Optional[str] = None
) -> Dict[str, Any]:
    """
    Safely record a simulated mock email into the mock_emails directory.

    Args:
        recipient: Email address of recipient.
        subject: Email subject line.
        body: Email text content.
        attachment: Optional file path or filename attachment.

    Returns:
        Structured response dictionary confirming mock email creation.
    """
    os.makedirs(_MOCK_EMAILS_DIR, exist_ok=True)

    timestamp = int(time.time() * 1000)
    filename = f"email_{timestamp}.json"
    file_path = os.path.join(_MOCK_EMAILS_DIR, filename)

    payload = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "recipient": recipient,
        "subject": subject,
        "body": body,
        "attachment": attachment or None,
        "status": "MOCK_SENT",
    }

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

        return {
            "success": True,
            "mock": True,
            "message": "Mock email created successfully (no real email was sent).",
            "details": {
                "recipient": recipient,
                "subject": subject,
                "saved_to": filename,
            },
        }
    except Exception as exc:
        return {
            "success": False,
            "error": "EMAIL_STORAGE_ERROR",
            "message": str(exc),
        }
