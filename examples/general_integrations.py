"""
General Agent Integration Examples

Shows how any agent (content writer, design agent, research agent,
meal planner) can integrate with HITL in just a few lines.
"""

from hitl import HitlClient

client = HitlClient(
    api_key="hitl_xxxxx",
    base_url="https://hitl.zachmartens.com"
)


# ─── Content Pipeline ───

def review_before_publish(title: str, draft: str, platform: str):
    """Content agent asks for approval before publishing."""
    result = client.approve_or_reject(
        agent_name="content-writer",
        title=f"Publish to {platform}: \"{title}\"?",
        description=f"Draft preview (first 500 chars):\n\n{draft[:500]}...\n\nWord count: {len(draft.split())}",
        agent_context=f"Content pipeline ready to publish to {platform}",
        priority="high",
        tags=["content", platform.lower()],
    )
    return result


def pick_linkedin_angle(topic: str, angles: list):
    """Content agent presents framing options for a LinkedIn post."""
    options = [
        {"id": str(i), "label": a["hook"], "description": a["approach"]}
        for i, a in enumerate(angles)
    ]
    result = client.choose_option(
        agent_name="content-writer",
        title=f"Pick the angle for your LinkedIn post about {topic}",
        options=options,
        agent_context="Drafting your weekly LinkedIn post",
        priority="normal",
        tags=["content", "linkedin"],
    )
    return int(result.selected_option)


# ─── Design Decisions ───

def pick_design_direction(component: str, options: list):
    """Design agent asks you to pick a visual direction."""
    result = client.choose_option(
        agent_name="design-agent",
        title=f"Pick the design direction for {component}",
        options=options,
        agent_context=f"Building the {component} for Covey",
        priority="normal",
        tags=["covey", "design"],
    )
    return result


# ─── Research Agent ───

def should_include_in_digest(topic: str, summary: str, relevance_note: str):
    """Research agent found something — should it make the cut?"""
    result = client.rate(
        agent_name="research-agent",
        title=f"How relevant is this for you? {topic}",
        description=f"{summary}\n\nRelevance note: {relevance_note}",
        agent_context="Curating your daily research digest",
        priority="low",
        tags=["research"],
    )
    return result.rating >= 3  # Only include if you rate 3+


# ─── Async Pattern (non-blocking) ───

def fire_and_forget_review(title: str, description: str):
    """
    Submit a request but DON'T block the agent.
    Use callback_method='webhook' to get notified when you respond.
    """
    import requests

    resp = requests.post(
        f"{client.base_url}/api/requests",
        headers={
            "Authorization": f"Bearer {client.api_key}",
            "Content-Type": "application/json",
        },
        json={
            "agent_name": "async-agent",
            "request_type": "approve_reject",
            "title": title,
            "description": description,
            "callback_method": "webhook",
            "callback_url": "https://your-agent.com/hitl-callback",
            "timeout_seconds": 86400,  # 24 hours to respond
        },
    )

    request_id = resp.json()["data"]["id"]
    print(f"Request submitted: {request_id}")
    print("Agent continues working... will get webhook when human responds.")
    return request_id


# ─── Batch Pattern (multiple questions at once) ───

def morning_review_batch():
    """
    Submit a batch of questions for your morning review session.
    All non-blocking — you handle them in one dashboard session.
    """
    questions = [
        client.approve_or_reject(
            agent_name="content-writer",
            title="Publish yesterday's draft: 'MCP Servers for Non-Devs'?",
            priority="high",
            tags=["content"],
            wait=False,  # Don't block!
        ),
        client.choose_option(
            agent_name="meal-planner",
            title="This week's Traeger cook?",
            options=[
                {"id": "ribs", "label": "Smoked Beef Ribs", "description": "8hr smoke, salt & pepper rub"},
                {"id": "brisket", "label": "Whole Brisket", "description": "12hr cook, post oak flavor"},
                {"id": "tri-tip", "label": "Tri-tip + Marrow Bones", "description": "Quick cook, reverse sear"},
            ],
            agent_name="meal-planner",
            wait=False,
        ),
        client.ask(
            agent_name="daily-brief",
            title="Any priorities I should know about for today?",
            description="It's Monday. You have 3 calendar events, 12 unread emails, and 2 pending PRs on Covey.",
            priority="normal",
            tags=["daily-brief"],
            wait=False,
        ),
    ]

    print(f"Submitted {len(questions)} review items.")
    print("Open your dashboard to handle them all at once.")
    return questions
