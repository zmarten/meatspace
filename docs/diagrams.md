# MeatSpace Diagrams

## 1. User Flow

How a request moves from an AI agent to a human and back.

```mermaid
sequenceDiagram
    participant Agent as AI Agent
    participant MS as MeatSpace API
    participant DB as Supabase
    participant Email as Resend
    participant Human as Human Reviewer

    Agent->>MS: POST /api/requests
    MS->>MS: Validate auth and fields
    MS->>DB: INSERT hitl_requests (pending)
    MS->>Email: Send notification with review link
    MS-->>Agent: 201 with id, review_url, poll_url

    Email-->>Human: Email with review link

    loop Agent polls
        Agent->>MS: GET /api/requests/id
        MS->>DB: SELECT status
        MS-->>Agent: status pending
    end

    Human->>MS: Opens /review/id (magic link)
    MS-->>Human: Review page with content and choices
    Human->>MS: PATCH /api/requests/id with selected option
    MS->>DB: UPDATE status completed
    MS-->>Human: Confirmation

    Agent->>MS: GET /api/requests/id
    MS-->>Agent: status completed, selected, selected_label
```

## 2. Architecture

How the components are deployed and connected.

```mermaid
graph TB
    A1[Claude Code - MCP]
    A2[Custom Agent - REST]
    A3[SDK Client - TS/Python]

    MW[Middleware - Auth]
    CREATE[POST /api/requests]
    POLL[GET /api/requests/id]
    WAIT[GET /api/requests/id/wait]
    PATCH[PATCH /api/requests/id]
    MCP[POST /api/mcp]
    STATUS[GET /api/status]

    LANDING[Landing Page]
    REVIEW[Review Page - magic link]
    DASHBOARD[Admin Dashboard]

    DISCOVERY[Discovery endpoints]

    DB[(Supabase - hitl_requests)]
    EMAIL[Resend Email]
    INBOX[Human Email Inbox]
    BROWSER[Human Browser]

    A1 --> MCP
    A2 --> MW
    A3 --> MW
    MW --> CREATE
    MW --> POLL

    CREATE --> DB
    CREATE --> EMAIL
    POLL --> DB
    WAIT --> DB
    PATCH --> DB
    MCP --> DB

    EMAIL --> INBOX
    INBOX --> BROWSER
    BROWSER --> REVIEW
    REVIEW --> PATCH

    PATCH -.-> A2

    DASHBOARD --> POLL
```

## 3. Process Flow

The complete lifecycle of a single HITL request.

```mermaid
flowchart TD
    START([Agent sends request]) --> AUTH{Bearer token valid?}
    AUTH -->|No| REJECT[401 Unauthorized]
    AUTH -->|Yes| VALIDATE{Fields valid?}
    VALIDATE -->|No| ERROR[400 Error]
    VALIDATE -->|Yes| INSERT[Insert into Supabase - status pending]

    INSERT --> NOTIFY[Send email via Resend]
    NOTIFY --> RESPOND[Return 201 with id and review_url]

    RESPOND --> WAITING{How does agent wait?}

    WAITING -->|Poll| POLL[GET /api/requests/id]
    WAITING -->|Long-poll| LONGPOLL[GET /api/requests/id/wait - 25s max]
    WAITING -->|MCP| MCPPOLL[ask_human tool - 20s max]
    WAITING -->|Webhook| PASSIVE[Agent continues - notified on completion]

    POLL --> CHECK{Request status?}
    LONGPOLL --> CHECK
    MCPPOLL --> CHECK

    CHECK -->|pending| EXPIRY{Past expires_at?}
    EXPIRY -->|No| RETRY[Return pending - agent retries]
    EXPIRY -->|Yes| EXPIRED[Mark expired]

    CHECK -->|completed| DONE[Return selected and selected_label]
    CHECK -->|expired| EXPIRED

    RETRY -.-> WAITING

    HUMAN([Human receives email]) --> CLICK[Click review link]
    CLICK --> LOAD[See content and choices]
    LOAD --> CHOOSE[Pick an option]
    CHOOSE --> SUBMIT[PATCH /api/requests/id]
    SUBMIT --> ALREADY{Already done?}
    ALREADY -->|Yes| CONFLICT[409 or 410 error]
    ALREADY -->|No| UPDATE[Update status to completed]
    UPDATE --> HOOK{callback_url set?}
    HOOK -->|Yes| FIRE[POST signed webhook]
    HOOK -->|No| CONFIRM[Show confirmation]
    FIRE --> CONFIRM

    UPDATE -.-> CHECK
```
