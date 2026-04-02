"""
HITL Python SDK — Human-in-the-Loop Service Client
Version 2.0 — with x402 payments, capacity checks, and demand voting

Usage:
    from hitl import HitlClient

    client = HitlClient(base_url="https://hitl.zachmartens.com")

    # Check if the human is available
    status = client.status()
    if not status["is_open"]:
        print(f"Closed. Opens at: {status['opens_at']}")

    # Ask for approval (blocks until human responds)
    result = client.approve_or_reject(
        title="Publish this blog post?",
        agent_name="content-writer",
    )
    if result.decision == "approved":
        publish_post()

    # Vote for an expertise area you need
    client.vote_expertise(
        category_slug="technical-review",
        agent_name="code-agent",
        use_case="Need human code review before production deploy",
        willingness_to_pay=0.50,
    )
"""

import time
import requests
from dataclasses import dataclass
from typing import Optional


@dataclass
class HitlResponse:
    """Response from the human reviewer."""
    request_id: str
    status: str
    decision: Optional[str] = None
    text: Optional[str] = None
    selected_option: Optional[str] = None
    rating: Optional[int] = None
    ranking: Optional[list] = None
    reasoning: Optional[str] = None
    responded_at: Optional[str] = None
    effort_tier: Optional[str] = None
    price_usdc: Optional[float] = None

    @classmethod
    def from_api(cls, data: dict) -> "HitlResponse":
        resp = data.get("response") or {}
        return cls(
            request_id=data.get("id", ""),
            status=data.get("status", "unknown"),
            decision=resp.get("decision"),
            text=resp.get("text"),
            selected_option=resp.get("selected_option"),
            rating=resp.get("rating"),
            ranking=resp.get("ranking"),
            reasoning=resp.get("reasoning"),
            responded_at=data.get("responded_at"),
        )


class HitlServiceClosed(Exception):
    """Raised when the human reviewer is offline."""
    def __init__(self, message: str, opens_at: str = None):
        super().__init__(message)
        self.opens_at = opens_at


class HitlQueueFull(Exception):
    """Raised when the queue is at capacity."""
    pass


class HitlPaymentRequired(Exception):
    """Raised when x402 payment is needed but no wallet is configured."""
    def __init__(self, payment_info: dict):
        self.payment_info = payment_info
        super().__init__(f"Payment required: {payment_info.get('pricing', {}).get('amount')} USDC")


class HitlClient:
    def __init__(
        self,
        base_url: str,
        api_key: str = None,
        auto_check_status: bool = True,
        retry_on_closed: bool = False,
        max_retry_wait: int = 3600,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.auto_check_status = auto_check_status
        self.retry_on_closed = retry_on_closed
        self.max_retry_wait = max_retry_wait
        self.session = requests.Session()
        if api_key:
            self.session.headers["Authorization"] = f"Bearer {api_key}"
        self.session.headers["Content-Type"] = "application/json"

    def status(self) -> dict:
        """Check service availability, pricing, queue depth."""
        resp = self.session.get(f"{self.base_url}/api/status")
        resp.raise_for_status()
        return resp.json()

    def _check_open(self):
        """Pre-flight check before submitting."""
        if not self.auto_check_status:
            return
        st = self.status()
        if not st.get("is_open"):
            raise HitlServiceClosed(
                st.get("reason", "Service is closed"),
                opens_at=st.get("opens_at"),
            )

    def _create_request(self, **kwargs) -> dict:
        """Create a new HITL request with retry logic."""
        if self.auto_check_status:
            try:
                self._check_open()
            except HitlServiceClosed as e:
                if not self.retry_on_closed:
                    raise
                print(f"HITL closed: {e}. Opens at: {e.opens_at}. Waiting...")
                self._wait_for_open()

        resp = self.session.post(f"{self.base_url}/api/requests", json=kwargs)

        # Handle 503 (closed/capacity)
        if resp.status_code == 503:
            data = resp.json()
            if self.retry_on_closed:
                print(f"HITL unavailable: {data.get('message')}. Retrying...")
                time.sleep(60)
                return self._create_request(**kwargs)
            raise HitlServiceClosed(
                data.get("message", "Service unavailable"),
                opens_at=data.get("opens_at"),
            )

        # Handle 402 (payment required)
        if resp.status_code == 402:
            data = resp.json()
            raise HitlPaymentRequired(data.get("payment_required", {}))

        resp.raise_for_status()
        data = resp.json()
        if not data.get("success"):
            raise Exception(f"HITL error: {data.get('error')}")
        return data["data"]

    def _wait_for_open(self):
        """Block until the service opens."""
        start = time.time()
        while time.time() - start < self.max_retry_wait:
            try:
                st = self.status()
                if st.get("is_open"):
                    return
            except Exception:
                pass
            time.sleep(30)
        raise TimeoutError("HITL service did not open within max_retry_wait")

    def _wait_for_response(self, request_id: str, timeout: int = 300) -> HitlResponse:
        """Long-poll until human responds."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            resp = self.session.get(
                f"{self.base_url}/api/requests/{request_id}/wait",
                params={"timeout": 30000},
            )
            resp.raise_for_status()
            data = resp.json()["data"]
            if data["status"] != "pending":
                return HitlResponse.from_api(data)
        raise TimeoutError(f"No response within {timeout}s for request {request_id}")

    # ─── Request methods ───

    def approve_or_reject(self, title: str, agent_name: str, description: str = None,
                          agent_context: str = None, priority: str = "normal",
                          tags: list = None, wait: bool = True, timeout: int = 300) -> HitlResponse:
        req = self._create_request(
            agent_name=agent_name, request_type="approve_reject",
            title=title, description=description, agent_context=agent_context,
            priority=priority, tags=tags or [],
        )
        if wait:
            return self._wait_for_response(req["id"], timeout)
        return HitlResponse(request_id=req["id"], status="pending",
                            effort_tier=req.get("effort_tier"), price_usdc=req.get("price_usdc"))

    def choose_option(self, title: str, options: list, agent_name: str, description: str = None,
                      agent_context: str = None, priority: str = "normal",
                      wait: bool = True, timeout: int = 300) -> HitlResponse:
        req = self._create_request(
            agent_name=agent_name, request_type="choose_option",
            title=title, description=description, agent_context=agent_context,
            options=options, priority=priority,
        )
        if wait:
            return self._wait_for_response(req["id"], timeout)
        return HitlResponse(request_id=req["id"], status="pending",
                            effort_tier=req.get("effort_tier"), price_usdc=req.get("price_usdc"))

    def ask(self, title: str, agent_name: str, description: str = None,
            agent_context: str = None, priority: str = "normal",
            wait: bool = True, timeout: int = 300) -> HitlResponse:
        req = self._create_request(
            agent_name=agent_name, request_type="free_text",
            title=title, description=description, agent_context=agent_context,
            priority=priority,
        )
        if wait:
            return self._wait_for_response(req["id"], timeout)
        return HitlResponse(request_id=req["id"], status="pending",
                            effort_tier=req.get("effort_tier"), price_usdc=req.get("price_usdc"))

    def rate(self, title: str, agent_name: str, description: str = None,
             agent_context: str = None, wait: bool = True, timeout: int = 300) -> HitlResponse:
        req = self._create_request(
            agent_name=agent_name, request_type="rate",
            title=title, description=description, agent_context=agent_context,
        )
        if wait:
            return self._wait_for_response(req["id"], timeout)
        return HitlResponse(request_id=req["id"], status="pending")

    def rank(self, title: str, options: list, agent_name: str, description: str = None,
             wait: bool = True, timeout: int = 300) -> HitlResponse:
        req = self._create_request(
            agent_name=agent_name, request_type="rank",
            title=title, description=description, options=options,
        )
        if wait:
            return self._wait_for_response(req["id"], timeout)
        return HitlResponse(request_id=req["id"], status="pending")

    # ─── Demand voting ───

    def list_expertise(self) -> dict:
        """List all expertise categories and their vote counts."""
        resp = self.session.get(f"{self.base_url}/api/expertise")
        resp.raise_for_status()
        return resp.json().get("data", {})

    def vote_expertise(self, category_slug: str, agent_name: str,
                       use_case: str = None, willingness_to_pay: float = None) -> dict:
        """Vote for an existing expertise category."""
        resp = self.session.post(f"{self.base_url}/api/expertise", json={
            "agent_name": agent_name,
            "category_slug": category_slug,
            "use_case": use_case,
            "willingness_to_pay": willingness_to_pay,
        })
        resp.raise_for_status()
        return resp.json()

    def propose_expertise(self, proposed_name: str, agent_name: str,
                          proposed_description: str = None, use_case: str = None,
                          willingness_to_pay: float = None) -> dict:
        """Propose a new expertise category."""
        resp = self.session.post(f"{self.base_url}/api/expertise", json={
            "agent_name": agent_name,
            "proposed_name": proposed_name,
            "proposed_description": proposed_description,
            "use_case": use_case,
            "willingness_to_pay": willingness_to_pay,
        })
        resp.raise_for_status()
        return resp.json()
