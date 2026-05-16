"""
Minimal LLM agent with MeatSpace HITL — no LangChain, no LangGraph, no MCP client.

If you have an OpenAI/Anthropic key and a MeatSpace key, this runs.

Pattern: tool-calling loop. Dangerous tools are gated through ask_human.
"""

from __future__ import annotations

import json
import os
import time

import httpx
from anthropic import Anthropic

MEATSPACE_BASE_URL = os.environ.get("MEATSPACE_BASE_URL", "https://meatspace.run")
MEATSPACE_API_KEY = os.environ["MEATSPACE_API_KEY"]

# ─── HITL helper ──────────────────────────────────────────────────────────────

def ask_human(title: str, content: str, choices: list[dict], recommended: str) -> str:
    headers = {"Authorization": f"Bearer {MEATSPACE_API_KEY}"}
    r = httpx.post(
        f"{MEATSPACE_BASE_URL}/api/requests",
        headers=headers,
        json={
            "agent_name": "vanilla-agent",
            "title": title,
            "content": content,
            "content_type": "markdown",
            "choices": choices,
            "recommended_option": recommended,
        },
        timeout=15.0,
    )
    r.raise_for_status()
    req_id = r.json()["id"]
    print(f"\n[meatspace] dispatch {req_id} — waiting for human…")
    deadline = time.time() + 300
    while time.time() < deadline:
        w = httpx.get(f"{MEATSPACE_BASE_URL}/api/requests/{req_id}/wait", headers=headers, timeout=30.0)
        w.raise_for_status()
        if w.json().get("status") == "completed":
            return w.json()["selected"]
    raise TimeoutError("MeatSpace timed out")


# ─── Tools ────────────────────────────────────────────────────────────────────

def tool_delete_file(path: str) -> str:
    choice = ask_human(
        title=f"Delete {path}?",
        content=f"The agent wants to delete `{path}`. This cannot be undone.",
        choices=[
            {"id": "yes", "label": "Yes, delete it"},
            {"id": "no", "label": "No, keep the file"},
        ],
        recommended="yes",
    )
    if choice == "yes":
        os.remove(path)
        return f"Deleted {path}"
    return f"User declined to delete {path}"


def tool_send_email(to: str, subject: str, body: str) -> str:
    choice = ask_human(
        title=f"Send email to {to}?",
        content=f"**Subject:** {subject}\n\n**Body:**\n\n{body}",
        choices=[
            {"id": "yes", "label": "Send it"},
            {"id": "no", "label": "Don't send"},
        ],
        recommended="yes",
    )
    if choice == "yes":
        return f"(simulated) Sent to {to}"
    return f"User declined to send email to {to}"


TOOLS = [
    {
        "name": "delete_file",
        "description": "Delete a file. Irreversible — will route through human approval.",
        "input_schema": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]},
    },
    {
        "name": "send_email",
        "description": "Send an email. Irreversible — will route through human approval.",
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {"type": "string"},
                "subject": {"type": "string"},
                "body": {"type": "string"},
            },
            "required": ["to", "subject", "body"],
        },
    },
]

DISPATCH = {"delete_file": tool_delete_file, "send_email": tool_send_email}

# ─── Agent loop ───────────────────────────────────────────────────────────────

def run(user_prompt: str) -> str:
    client = Anthropic()
    messages = [{"role": "user", "content": user_prompt}]

    for _ in range(10):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    print(f"\n→ tool: {block.name}({json.dumps(block.input)})")
                    out = DISPATCH[block.name](**block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": out,
                    })
            messages.append({"role": "user", "content": tool_results})
            continue

        return "".join(b.text for b in response.content if b.type == "text")
    return "(max iterations)"


if __name__ == "__main__":
    print(run("Send a goodbye email to alice@example.com — short, warm, signed Bob."))
