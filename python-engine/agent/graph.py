"""
LangGraph graph definition for AgentShield LangGraph Agent.

Workflow:
  START
    ↓
  scope_extraction
    ↓
  rag_retrieval
    ↓
  content_firewall
    ↓
  agent_planner
    ↓
  agent_reasoning (action_proposal)
    ↓
  action_guard ──(ALLOW?)──> tool_execution ──┐
       │                                       │
       └──(BLOCK/loop back)──> agent_reasoning <──┘
                                      │
                              (no tool needed)
                                      ↓
                             response_builder
                                      ↓
                                     END
"""

try:
    from langgraph.graph import StateGraph, END
except ImportError:
    from langgraph.graph.state import StateGraph, END

from agent.state import AgentState
from agent.nodes import (
    scope_extraction_node,
    rag_retrieval_node,
    content_firewall_node,
    agent_planner_node,
    agent_reasoning_node,
    action_guard_node,
    tool_execution_node,
    response_builder_node,
)


def _should_continue(state: AgentState) -> str:
    """Conditional router: route to action_guard if proposed_tool is set, else response_builder."""
    proposed_tool = state.get("proposed_tool")
    if proposed_tool:
        return "action_guard"
    return "response_builder"


def _guard_decision(state: AgentState) -> str:
    """
    Conditional router after Action Guard:
    - If tool was BLOCKED (proposed_tool cleared by guard), loop back to agent_reasoning.
    - If tool is ALLOWED (proposed_tool still set), proceed to tool_execution.
    - If ASK_HUMAN, loop back to agent_reasoning (sandbox: proceeds with flag).
    """
    proposed_tool = state.get("proposed_tool")
    if proposed_tool:
        return "tool_execution"
    # Tool was blocked by Action Guard — loop back to reasoning for legitimate task continuation
    return "agent_reasoning"


def build_agent_graph() -> StateGraph:
    """Construct and compile the AgentShield LangGraph agent graph with Action Guard."""
    builder = StateGraph(AgentState)

    # Register nodes
    builder.add_node("scope_extraction", scope_extraction_node)
    builder.add_node("rag_retrieval", rag_retrieval_node)
    builder.add_node("content_firewall", content_firewall_node)
    builder.add_node("agent_planner", agent_planner_node)
    builder.add_node("agent_reasoning", agent_reasoning_node)
    builder.add_node("action_guard", action_guard_node)
    builder.add_node("tool_execution", tool_execution_node)
    builder.add_node("response_builder", response_builder_node)

    # Entry point
    builder.set_entry_point("scope_extraction")

    # Static pipeline edges
    builder.add_edge("scope_extraction", "rag_retrieval")
    builder.add_edge("rag_retrieval", "content_firewall")
    builder.add_edge("content_firewall", "agent_planner")
    builder.add_edge("agent_planner", "agent_reasoning")

    # Conditional edge from agent_reasoning → action_guard or response_builder
    builder.add_conditional_edges(
        "agent_reasoning",
        _should_continue,
        {
            "action_guard": "action_guard",
            "response_builder": "response_builder",
        },
    )

    # Conditional edge from action_guard → tool_execution (if allowed) or back to agent_reasoning (if blocked)
    builder.add_conditional_edges(
        "action_guard",
        _guard_decision,
        {
            "tool_execution": "tool_execution",
            "agent_reasoning": "agent_reasoning",
        },
    )

    # Loop back from tool_execution to agent_reasoning for multi-step tool calls
    builder.add_edge("tool_execution", "agent_reasoning")

    # Termination
    builder.add_edge("response_builder", END)

    return builder.compile()


# Module-level compiled graph singleton
agent_graph = build_agent_graph()
