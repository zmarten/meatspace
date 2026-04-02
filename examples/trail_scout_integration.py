"""
Trail Scout → HITL Integration Example

This shows how your trail-scout agent on OpenClaw can ask you
for judgment when trail data sources conflict.
"""

from hitl import HitlClient

client = HitlClient(
    api_key="hitl_xxxxx",
    base_url="https://hitl.zachmartens.com"  # or wherever you deploy
)


# ─── Scenario 1: Sources conflict on trail conditions ───

def handle_conflicting_trail_data(trail_name: str, sources: dict):
    """
    When AllTrails, Strava, and Facebook groups disagree,
    ask the human which source to trust and how to frame it.
    """
    source_summary = "\n".join(
        f"• {name}: {condition}" for name, condition in sources.items()
    )

    result = client.ask(
        agent_name="trail-scout",
        title=f"Conflicting reports for {trail_name} — how should I call it?",
        description=f"Here's what each source says:\n\n{source_summary}\n\nHow should I summarize this for users? Should I lean toward the most recent source, be conservative, or note the conflict?",
        agent_context="Building today's trail conditions digest for Bozeman area",
        priority="normal",
        tags=["trails", "bozeman"],
    )

    return result.text  # Your free-text guidance


# ─── Scenario 2: Should I alert about a trail closure? ───

def check_trail_closure_alert(trail_name: str, reason: str, source: str):
    """
    Before pushing a trail closure alert, confirm with the human
    that the source is legit and the alert should go out.
    """
    result = client.approve_or_reject(
        agent_name="trail-scout",
        title=f"Send trail closure alert: {trail_name}?",
        description=f"Source: {source}\nReason: {reason}\n\nShould I push this alert to subscribers?",
        agent_context="Trail closure monitoring pipeline",
        priority="high",
        tags=["trails", "alert"],
    )

    if result.decision == "approved":
        send_alert(trail_name, reason)
        return True
    return False


# ─── Scenario 3: Pick the best trail recommendation for conditions ───

def pick_daily_recommendation(candidates: list):
    """
    Given today's weather and conditions, ask the human to pick
    the best trail to feature in the daily digest.
    """
    options = [
        {
            "id": trail["slug"],
            "label": trail["name"],
            "description": f"{trail['distance']}mi • {trail['condition']} • {trail['weather_match']}"
        }
        for trail in candidates
    ]

    result = client.choose_option(
        agent_name="trail-scout",
        title="Pick today's featured trail",
        description="Based on current weather (55°F, partly cloudy, light wind) and recent conditions reports, here are the top candidates:",
        options=options,
        agent_context="Building the daily Bozeman trail digest",
        priority="normal",
        tags=["trails", "daily-digest"],
    )

    chosen_trail = next(t for t in candidates if t["slug"] == result.selected_option)
    return chosen_trail


# ─── Scenario 4: Rate a user-submitted trail report ───

def rate_user_report_quality(report: dict):
    """
    When a community member submits a trail report, have the human
    rate its quality before boosting it in the feed.
    """
    result = client.rate(
        agent_name="trail-scout",
        title=f"Rate this trail report for {report['trail_name']}",
        description=f"Submitted by: {report['username']}\nDate: {report['date']}\n\n\"{report['text']}\"\n\nPhotos: {report.get('photo_count', 0)}",
        agent_context="Community report quality scoring pipeline",
        priority="low",
        tags=["trails", "community"],
    )

    return result.rating  # 1-5, you can use this as a quality score


# ─── Example usage ───

if __name__ == "__main__":
    # Conflicting data scenario
    guidance = handle_conflicting_trail_data(
        trail_name="Drinking Horse Mountain",
        sources={
            "AllTrails (2 days ago)": "Muddy, some standing water on lower trail",
            "Strava activity (yesterday)": "Dry conditions, fast and firm",
            "Facebook - Bozeman Trail Runners (today)": "Mostly dry with a few wet spots near the creek crossing",
        }
    )
    print(f"Human guidance: {guidance}")

    # Daily recommendation
    featured = pick_daily_recommendation([
        {"slug": "drinking-horse", "name": "Drinking Horse Mountain", "distance": 3.8, "condition": "Mostly dry", "weather_match": "Good for today's weather"},
        {"slug": "peets-hill", "name": "Peet's Hill", "distance": 1.2, "condition": "Dry", "weather_match": "Quick option, exposed to wind"},
        {"slug": "leverich-canyon", "name": "Leverich Canyon", "distance": 5.1, "condition": "Some mud", "weather_match": "Shaded, good for warm afternoon"},
    ])
    print(f"Featured trail: {featured['name']}")
