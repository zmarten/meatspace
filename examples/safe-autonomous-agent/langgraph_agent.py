"""
LangGraph agent template with MeatSpace human-in-the-loop gating.

This agent can execute tools, but before any tool marked `requires_human=True`,
it pauses and routes the decision to MeatSpace. A human gets a magic-link email,
taps a choice on their phone, and the agent resumes with the decision.

Why this exists:
- LangGraph's built-in `HumanInTheLoopMiddleware` requires you to host your own
  reviewer UI and operate it as the human.
- MeatSpace hosts the reviewer page, sends the email/notification, and returns
  a structured choice — so you don't need to build any of that.

See https://meatspace.run for the service.
"""

from __future__ import annotations

import os
import time
from typing import Annotated, Literal, TypedDict

import httpx
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

MEATSPACE_BASE_URL = os.environ.get("MEATSPACE_BASE_URL", "https://meatspace.run")
MEATSPACE_API_KEY = os.environ["MEATSPACE_API_KEY"]  # provision at https://meatspace.run
AGENT_NAME = "safe-autonomous-agent"

# ─── MeatSpace HITL helper ────────────────────────────────────────────────────

def ask_human(
    title: str,
    content: str,
    choices: list[dict],
    decision_reason: str,
    recommended: str,
    timeout_seconds: int = 300,
) -> str:
    """Submit a decision to a real human via MeatSpace and block until they answer.

    Returns the `id` of the selected choice (e.g. 'yes' / 'no' / 'modify').
    """
    headers = {"Authorization": f"Bearer {MEATSPACE_API_KEY}"}
    create = httpx.post(
        f"{MEATSPACE_BASE_URL}/api/requests",
        headers=headers,
        json={
            "agent_name": AGENT_NAME,
            "title": title,
            "content": content,
            "content_type": "markdown",
            "choices": choices,
            "decision_reason": decision_reason,
            "recommended_option": recommended,
            "confidence": 0.5,
        },
        timeout=15.0,
    )
    create.raise_for_status()
    request_id = create.json()["id"]
    print(f"[meatspace] dispatch {request_id} — review at {create.json().get('review_url')}")

    # Long-poll. /wait blocks up to 25s on edge; loop until timeout_seconds elapsed.
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        resp = httpx.get(
            f"{MEATSPACE_BASE_URL}/api/requests/{request_id}/wait",
            headers=headers,
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "completed":
            print(f"[meatspace] resolved: {data['selected']} ({data.get('selected_label')})")
            return data["selected"]
    raise TimeoutError(f"MeatSpace dispatch {request_id} timed out after {timeout_seconds}s")


# ─── Example destructive tools (these are what we want to gate) ──────────────

@tool
def delete_file(path: str) -> str:
    """Delete a file at the given path. Irreversible."""
    # This tool is marked dangerous — the graph will route it through MeatSpace
    # before actually calling it. The implementation below only runs after approval.
    os.remove(path)
    return f"Deleted {path}"


@tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email. Irreversible once delivered."""
    # In your real agent this would call SES, SendGrid, Resend, etc.
    return f"(simulated) Sent email to {to}: {subject}"


@tool
def push_to_main(repo_path: str, force: bool = False) -> str:
    """Push the current branch to main. Force-push is dangerous on shared branches."""
    flag = "--force" if force else ""
    return f"(simulated) git push origin main {flag} from {repo_path}"


@tool
def read_file(path: str) -> str:
    """Read a file. Safe — not gated."""
    with open(path) as f:
        return f.read()


DANGEROUS_TOOLS = {"delete_file", "send_email", "push_to_main"}

TOOLS = [delete_file, send_email, push_to_main, read_file]
TOOLS_BY_NAME = {t.name: t for t in TOOLS}


# ─── Graph state ──────────────────────────────────────────────────────────────

class State(TypedDict):
    messages: Annotated[list, add_messages]


# ─── Nodes ────────────────────────────────────────────────────────────────────

llm = ChatAnthropic(model="claude-sonnet-4-6").bind_tools(TOOLS)


def call_model(state: State) -> dict:
    response = llm.invoke(state["messages"])
    return {"messages": [response]}


def execute_tools(state: State) -> dict:
    last = state["messages"][-1]
    if not isinstance(last, AIMessage) or not last.tool_calls:
        return {"messages": []}

    results = []
    for call in last.tool_calls:
        name = call["name"]
        args = call["args"]

        if name in DANGEROUS_TOOLS:
            content_md = (
                f"**Tool:** `{name}`\n\n"
                f"**Arguments:**\n```json\n{args}\n```\n\n"
                f"This action is irreversible. The agent recommends approving."
            )
            choice = ask_human(
                title=f"Allow `{name}`?",
                content=content_md,
                choices=[
                    {"id": "yes", "label": "Yes, run it"},
                    {"id": "no", "label": "No, abort"},
                    {"id": "modify", "label": "Stop — I want to change args"},
                ],
                decision_reason=f"`{name}` is in the dangerous tools list.",
                recommended="yes",
            )

            if choice == "no":
                results.append(ToolMessage(
                    content=f"HUMAN REJECTED {name}. Do not retry without new instruction.",
                    tool_call_id=call["id"],
                ))
                continue
            if choice == "modify":
                results.append(ToolMessage(
                    content=f"HUMAN REQUESTED MODIFICATION of {name}. Ask the user what to change.",
                    tool_call_id=call["id"],
                ))
                continue
            # else: approved, fall through

        try:
            output = TOOLS_BY_NAME[name].invoke(args)
            results.append(ToolMessage(content=str(output), tool_call_id=call["id"]))
        except Exception as e:
            results.append(ToolMessage(content=f"ERROR: {e}", tool_call_id=call["id"]))

    return {"messages": results}


def should_continue(state: State) -> Literal["tools", "end"]:
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return "end"


# ─── Build graph ──────────────────────────────────────────────────────────────

builder = StateGraph(State)
builder.add_node("agent", call_model)
builder.add_node("tools", execute_tools)
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", should_continue, {"tools": "tools", "end": END})
builder.add_edge("tools", "agent")

graph = builder.compile()


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    result = graph.invoke({
        "messages": [HumanMessage(content=(
            "Clean up the build artifacts in this directory. "
            "There's a stale dist/old-build.tar.gz that should be removed."
        ))]
    })
    for msg in result["messages"]:
        print(f"\n[{type(msg).__name__}]")
        print(msg.content if hasattr(msg, "content") else msg)
