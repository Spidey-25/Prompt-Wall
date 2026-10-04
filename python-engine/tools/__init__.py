"""
PromptWall Stage 5 Safe Mock Tools Package.
"""

from tools.read_file import read_file
from tools.search_web import search_web
from tools.send_email import send_email
from tools.write_record import write_record

AVAILABLE_TOOLS = {
    "read_file": read_file,
    "search_web": search_web,
    "send_email": send_email,
    "write_record": write_record,
}

__all__ = ["read_file", "search_web", "send_email", "write_record", "AVAILABLE_TOOLS"]
