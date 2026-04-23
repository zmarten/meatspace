"""
MeatSpace Python SDK
Flesh-in-the-loop for autonomous agents.

pip install meatspace

Usage:
    from meatspace import MeatSpace

    ms = MeatSpace(
        base_url="https://meatspace.run",
        api_key="hitl_...",
    )

    result = ms.ask(
        agent_name="my-agent",
        title="Which hero image?",
        content='<img src="https://example.com/a.png"/>',
        content_type="html",
        choices=[
            {"id": "a", "label": "Option A"},
            {"id": "b", "label": "Option B"},
        ],
    )

    print(result.selected)  # 'a' or 'b'
"""

import time
import requests
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


@dataclass
class Choice:
    """A selectable option."""
    id: str
    label: str


@dataclass
class AskResult:
    """Result from a MeatSpace request."""
    request_id: str
    status: str  # 'pending', 'completed', 'expired'
    selected: Optional[str] = None
    selected_label: Optional[str] = None
    responded_at: Optional[str] = None
    expires_at: Optional[str] = None
    review_url: str = ""
    poll_url: str = ""


class MeatSpaceError(Exception):
    """Raised on API errors."""
    def __init__(self, message: str, status: int = 0, code: Optional[str] = None):
        super().__init__(message)
        self.status = status
        self.code = code


class MeatSpace:
    """MeatSpace API client — single method: ask()."""

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        })

    def ask(
        self,
        agent_name: str,
        title: str,
        choices: List[Dict[str, str]],
        content: Optional[str] = None,
        content_type: Optional[str] = None,
        callback_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        decision_reason: Optional[str] = None,
        confidence: Optional[float] = None,
        consequence_of_wrong_choice: Optional[str] = None,
        recommended_option: Optional[str] = None,
        run_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
        wait: bool = True,
        wait_timeout: int = 300,
    ) -> AskResult:
        """
        Submit content and choices to a human.

        Args:
            agent_name: Your agent/tool name (max 100 chars).
            title: Short title for the request (max 200 chars).
            choices: List of dicts with 'id' and 'label' keys (2-4 items).
            content: Content for human review (max 50KB).
            content_type: 'text', 'markdown', 'html', or 'image'.
            callback_url: HTTPS webhook URL for async notification.
            metadata: Arbitrary dict passed through to webhook (max 10KB).
            decision_reason: Why the agent is escalating to a human.
            confidence: Agent confidence between 0 and 1.
            consequence_of_wrong_choice: Why a wrong choice would matter.
            recommended_option: Optional choice id the agent recommends.
            run_id: Optional workflow run identifier.
            trace_id: Optional trace identifier.
            timeout_seconds: Request expiry in seconds (default 3600, max 86400).
            wait: Block until human responds (default True).
            wait_timeout: Max seconds to wait when wait=True (default 300).

        Returns:
            AskResult with request_id, status, selected, responded_at, etc.
        """
        body: Dict[str, Any] = {
            "agent_name": agent_name,
            "title": title,
            "choices": choices,
        }
        if content is not None:
            body["content"] = content
        if content_type is not None:
            body["content_type"] = content_type
        if callback_url is not None:
            body["callback_url"] = callback_url
        if metadata is not None:
            body["metadata"] = metadata
        if decision_reason is not None:
            body["decision_reason"] = decision_reason
        if confidence is not None:
            body["confidence"] = confidence
        if consequence_of_wrong_choice is not None:
            body["consequence_of_wrong_choice"] = consequence_of_wrong_choice
        if recommended_option is not None:
            body["recommended_option"] = recommended_option
        if run_id is not None:
            body["run_id"] = run_id
        if trace_id is not None:
            body["trace_id"] = trace_id
        if timeout_seconds is not None:
            body["timeout_seconds"] = timeout_seconds

        resp = self.session.post(f"{self.base_url}/api/requests", json=body)

        if not resp.ok:
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            raise MeatSpaceError(
                data.get("error", f"HTTP {resp.status_code}"),
                resp.status_code,
                data.get("code"),
            )

        data = resp.json()
        if not data.get("success"):
            raise MeatSpaceError(data.get("error", "Unknown error"), code=data.get("code"))

        d = data["data"]
        result = AskResult(
            request_id=d["id"],
            status="pending",
            expires_at=d.get("expires_at"),
            review_url=d.get("review_url", ""),
            poll_url=d.get("poll_url", ""),
        )

        if not wait:
            return result

        return self._wait_for_response(d["id"], wait_timeout, result)

    def poll(self, request_id: str) -> AskResult:
        """Check the current status of a request (non-blocking)."""
        resp = self.session.get(f"{self.base_url}/api/requests/{request_id}")
        data = resp.json()
        if not data.get("success"):
            raise MeatSpaceError(data.get("error", "Not found"), resp.status_code)
        d = data["data"]
        return AskResult(
            request_id=d["id"],
            status=d["status"],
            selected=d.get("selected"),
            selected_label=d.get("selected_label"),
            responded_at=d.get("responded_at"),
            expires_at=d.get("expires_at"),
            review_url=f"{self.base_url}/review/{d['id']}",
            poll_url=f"/api/requests/{d['id']}",
        )

    def _wait_for_response(
        self, request_id: str, timeout: int, initial: AskResult
    ) -> AskResult:
        """Long-poll until the human responds or timeout."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            resp = self.session.get(
                f"{self.base_url}/api/requests/{request_id}/wait",
                params={"timeout": 30000},
            )
            resp.raise_for_status()
            d = resp.json()["data"]
            if d["status"] != "pending":
                return AskResult(
                    request_id=initial.request_id,
                    status=d["status"],
                    selected=d.get("selected"),
                    selected_label=d.get("selected_label"),
                    responded_at=d.get("responded_at"),
                    expires_at=d.get("expires_at", initial.expires_at),
                    review_url=initial.review_url,
                    poll_url=initial.poll_url,
                )
        return initial  # still pending
