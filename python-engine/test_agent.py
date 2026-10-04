# -*- coding: utf-8 -*-
"""
Comprehensive Stage 5 Mock Tools Integration Tests.

Tests:
  1. read_file tool (sandbox file reading)
  2. search_web tool (local mock search)
  3. send_email tool (mock email storage, no real email)
  4. write_record tool (mock database record storage)
  5. Multi-step tool use (sequential tool calls)
  6. Safety & Sandbox verification (path traversal protection & isolation)
"""

import os
import sys

os.chdir(os.path.dirname(__file__) or ".")
from agent.service import AgentService
from tools.read_file import read_file
from tools.send_email import send_email
from tools.write_record import write_record


def run_test(label: str, message: str, check_fn):
    print(f"\n{'='*65}")
    print(f"TEST: {label}")
    print(f"Query: '{message}'")
    print("="*65)

    result = AgentService.run(message)

    print(f"[success]     {result['success']}")
    print(f"[tool_calls]  {[c['tool'] for c in result['tool_calls']]}")
    print(f"[context_cnt] {len(result['retrieved_context'])}")
    print(f"\n[Agent Response]\n{result['response']}")

    assert result["success"] is True, "Expected success=True"
    check_fn(result)
    print(f"\nPASSED: {label}")


if __name__ == "__main__":
    print("[Stage 5 Test] Running Mock Tools Integration Tests...\n")

    # TEST 1 — read_file
    def check_test1(res):
        tools_used = [c["tool"] for c in res["tool_calls"]]
        assert "read_file" in tools_used, "Expected read_file tool to be called"
        file_res = [r["result"] for r in res["tool_results"] if r["tool"] == "read_file"][0]
        assert file_res["success"] is True, "read_file should succeed"
        assert "CONFIDENTIAL" in file_res["content"], "Should read confidential_document.txt"

    run_test(
        label="TEST 1 — read_file tool",
        message="Read the confidential_document.txt file and show me its contents.",
        check_fn=check_test1,
    )

    # TEST 2 — search_web
    def check_test2(res):
        tools_used = [c["tool"] for c in res["tool_calls"]]
        assert "search_web" in tools_used, "Expected search_web tool to be called"
        web_res = [r["result"] for r in res["tool_results"] if r["tool"] == "search_web"][0]
        assert web_res["success"] is True, "search_web should succeed"
        assert len(web_res["results"]) > 0, "Expected non-empty search results"

    run_test(
        label="TEST 2 — search_web tool",
        message="Search the web for vendor delivery standards and SLAs.",
        check_fn=check_test2,
    )

    # TEST 3 — send_email
    def check_test3(res):
        tools_used = [c["tool"] for c in res["tool_calls"]]
        assert "send_email" in tools_used, "Expected send_email tool to be called"
        email_res = [r["result"] for r in res["tool_results"] if r["tool"] == "send_email"][0]
        assert email_res["success"] is True and email_res["mock"] is True, "Mock email should succeed"
        assert os.path.exists("data/mock_emails"), "Mock email directory should exist"

    run_test(
        label="TEST 3 — send_email tool",
        message="Send the vendor comparison report to manager@example.com via email.",
        check_fn=check_test3,
    )

    # TEST 4 — write_record
    def check_test4(res):
        tools_used = [c["tool"] for c in res["tool_calls"]]
        assert "write_record" in tools_used, "Expected write_record tool to be called"
        rec_res = [r["result"] for r in res["tool_results"] if r["tool"] == "write_record"][0]
        assert rec_res["success"] is True and rec_res["mock"] is True, "Mock record should succeed"
        assert "record_id" in rec_res, "Expected valid record_id"
        assert os.path.exists("data/mock_records"), "Mock record directory should exist"

    run_test(
        label="TEST 4 — write_record tool",
        message="Store this vendor comparison analysis as a database record.",
        check_fn=check_test4,
    )

    # TEST 5 — MULTI-STEP tool use
    def check_test5(res):
        tools_used = [c["tool"] for c in res["tool_calls"]]
        assert len(tools_used) >= 2, f"Expected at least 2 tool calls, got {tools_used}"
        assert "read_file" in tools_used, "Expected read_file in multi-step flow"
        assert "write_record" in tools_used, "Expected write_record in multi-step flow"

    run_test(
        label="TEST 5 — Multi-step tool use (read_file then write_record)",
        message="Read the confidential_document.txt file and store a vendor comparison record.",
        check_fn=check_test5,
    )

    # TEST 6 — Safety & Sandbox verification
    print(f"\n{'='*65}")
    print("TEST 6 — Safety of Mock Tools (Sandbox & Isolation)")
    print("="*65)

    # Path traversal attack check
    traversal_res = read_file("../../etc/passwd")
    assert traversal_res["success"] is False, "Path traversal should fail"
    assert traversal_res["error"] == "PATH_TRAVERSAL_DENIED", "Expected PATH_TRAVERSAL_DENIED"
    print("[OK] Path traversal protection verified (../../etc/passwd denied)")

    # Send email check
    email_check = send_email("attacker@example.com", "Test", "Body")
    assert email_check["mock"] is True, "Email must be mocked"
    print("[OK] Send email safety verified (no real email sent)")

    # Write record check
    rec_check = write_record("test_type", {"test": True})
    assert rec_check["mock"] is True, "Record write must be mocked"
    print("[OK] Record write safety verified (restricted to mock_records)")

    print("\nPASSED: TEST 6 — Safety of Mock Tools")

    print("\n" + "="*65)
    print("ALL STAGE 5 MOCK TOOL TESTS PASSED SUCCESSFULLY")
    print("="*65)
