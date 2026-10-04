import os
import glob
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="PromptWall Python Engine")

_MOCK_FILES_DIR = os.path.realpath(
    os.path.join(os.path.dirname(__file__), "data", "mock_files")
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    success: bool
    service: str
    status: str


class AgentRunRequest(BaseModel):
    message: str


class AgentRunResponse(BaseModel):
    success: bool
    response: str
    scope: Optional[Dict[str, Any]] = None
    retrieved_context: List[Dict[str, Any]]
    firewall_result: Optional[Dict[str, Any]] = None
    action_guard_result: Optional[Dict[str, Any]] = None
    tool_used: Optional[str] = None
    tool_result: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None
    audit_events: Optional[List[Dict[str, Any]]] = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health_check():
    return {
        "success": True,
        "service": "promptwall-python",
        "status": "running",
    }


@app.get("/rulebook/info")
def rulebook_info():
    """Return metadata and active rules summary of the AgentShield Security Policy."""
    from security.rulebook import get_rulebook_info
    return {"success": True, "rulebook": get_rulebook_info()}


@app.post("/scope/extract")
def extract_scope(request: AgentRunRequest):
    """
    Stage 7 Scope Extractor endpoint.
    Extracts intended scope strictly from the trusted user prompt.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    from scope import scope_extractor
    scope = scope_extractor.extract(request.message.strip())
    return {"success": True, "scope": scope.model_dump()}


@app.get("/files/list")
def list_files():
    """List all files currently in the read_file sandbox (mock_files/)."""
    os.makedirs(_MOCK_FILES_DIR, exist_ok=True)
    files = []
    for f in sorted(os.listdir(_MOCK_FILES_DIR)):
        full = os.path.join(_MOCK_FILES_DIR, f)
        if os.path.isfile(full):
            files.append({
                "name": f,
                "size": os.path.getsize(full),
            })
    return {"success": True, "files": files, "sandbox": "data/mock_files/"}




@app.post("/agent/run", response_model=AgentRunResponse)
def agent_run(request: AgentRunRequest):
    """
    Run the Stage 5 LangGraph tool-using agent for a user message.

    Workflow:
      User message → RAG retrieval → Agent reasoning → Tool execution → Final response
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    from agent.service import AgentService
    result = AgentService.run(request.message.strip())
    return result


@app.post("/evaluation/run")
def run_evaluation():
    """Execute the full AgentShield security evaluation suite through LangGraph."""
    from evaluation.runner import EvaluationRunner
    summary = EvaluationRunner.run_suite()
    return {"success": True, "evaluation": summary.model_dump()}


@app.get("/evaluation/latest")
def get_latest_evaluation():
    """Fetch the latest real empirical evaluation metrics."""
    from evaluation.runner import EvaluationRunner
    summary = EvaluationRunner.get_latest_summary()
    return {"success": True, "evaluation": summary.model_dump()}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PYTHON_PORT", 8000))
    host = os.getenv("PYTHON_HOST", "127.0.0.1")
    uvicorn.run("app:app", host=host, port=port, reload=True)
