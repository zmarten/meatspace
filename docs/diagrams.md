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

    Agent->>MS: POST /api/requests<br/>(title, choices, content)
    MS->>MS: Validate request<br/>(auth, fields, limits)
    MS->>DB: INSERT into hitl_requests<br/>(status: pending)
    MS->>Email: Send notification email<br/>(review link)
    MS-->>Agent: 201 { id, review_url, poll_url }

    Email-->>Human: Email with review link

    par Agent polls for result
        loop Every few seconds
            Agent->>MS: GET /api/requests/{id}
            MS->>DB: SELECT status
            MS-->>Agent: { status: pending }
        end
    and Human reviews
        Human->>MS: Opens /review/{id}<br/>(magic link, no login)
        MS->>DB: SELECT request details
        MS-->>Human: Review page with<br/>content + choices
        Human->>MS: PATCH /api/requests/{id}<br/>{ selected_option: "b" }
        MS->>DB: UPDATE status=completed,<br/>selected="b"
        MS-->>Human: Confirmation screen
    end

    Agent->>MS: GET /api/requests/{id}
    MS->>DB: SELECT status
    MS-->>Agent: { status: completed,<br/>selected: "b",<br/>selected_label: "Option B" }

    opt If callback_url was set
        MS->>Agent: POST webhook with<br/>signed payload
    end
```

## 2. Architecture

How the components are deployed and connected.

```mermaid
graph TB
    subgraph Agents["AI Agents"]
        A1[Claude Code<br/>via MCP]
        A2[Custom Agent<br/>via REST API]
        A3[SDK Client<br/>TypeScript/Python]
    end

    subgraph CF["Cloudflare Pages"]
        subgraph Edge["Edge Runtime"]
            MW[Middleware<br/>Auth: Bearer token + Admin secret]
            API_REQ["POST /api/requests<br/>Create request"]
            API_POLL["GET /api/requests/{id}<br/>Poll status"]
            API_WAIT["GET /api/requests/{id}/wait<br/>Long-poll (25s max)"]
            API_PATCH["PATCH /api/requests/{id}<br/>Submit human choice"]
            API_MCP["POST /api/mcp<br/>MCP JSON-RPC"]
            API_STATUS["GET /api/status<br/>Health + guidance"]
        end
        subgraph Static["Static Pages"]
            LANDING[Landing Page<br/>meatspace.run]
            REVIEW["/review/{id}<br/>Magic link review page"]
            DASH["/dashboard<br/>Admin view"]
            DOCS["/docs<br/>API documentation"]
        end
        subgraph Discovery["Discovery Files"]
            MCP_JSON["/.well-known/mcp.json"]
            AGENT_JSON["/.well-known/agent.json"]
            AGENTS_MD["/agents.md"]
            LLMS["/llms.txt"]
            OPENAPI["/api/openapi"]
        end
    end

    subgraph Supabase["Supabase"]
        DB[(hitl_requests<br/>table)]
        RT[Realtime<br/>subscriptions]
    end

    subgraph Resend["Resend"]
        EMAIL[Email API<br/>noreply@meatspace.run]
    end

    subgraph Human["Human Reviewer"]
        INBOX[Email Inbox]
        BROWSER[Browser]
    end

    A1 -->|MCP JSON-RPC| API_MCP
    A2 -->|REST + Bearer token| MW
    A3 -->|REST + Bearer token| MW
    MW --> API_REQ
    MW --> API_POLL

    API_REQ -->|INSERT| DB
    API_REQ -->|Send email| EMAIL
    API_POLL -->|SELECT| DB
    API_WAIT -->|SELECT loop| DB
    API_PATCH -->|UPDATE| DB
    API_MCP -->|INSERT + poll| DB

    EMAIL -->|Notification| INBOX
    INBOX -->|Click review link| BROWSER
    BROWSER --> REVIEW
    REVIEW -->|PATCH| API_PATCH

    API_PATCH -.->|Webhook POST| A2

    DASH -->|GET /api/requests| API_POLL
    RT -.->|Realtime updates| DASH
```

## 3. Process Flow

The complete lifecycle of a single HITL request, including all possible states and error paths.

```mermaid
flowchart TD
    START([Agent sends request]) --> AUTH{Bearer token<br/>valid?}
    AUTH -->|No| REJECT[401 Unauthorized]
    AUTH -->|Yes| VALIDATE{Fields valid?<br/>2-4 choices?<br/>Limits ok?}
    VALIDATE -->|No| ERROR[400 + error code]
    VALIDATE -->|Yes| INSERT[Insert into Supabase<br/>status: pending<br/>generate UUID]

    INSERT --> NOTIFY[Send email notification<br/>via Resend]
    NOTIFY --> RESPOND[Return 201<br/>id, review_url, poll_url]

    RESPOND --> WAITING{Agent waits<br/>for result}

    WAITING -->|Poll| POLL[GET /api/requests/id]
    WAITING -->|Long-poll| LONGPOLL[GET /api/requests/id/wait<br/>holds up to 25s]
    WAITING -->|MCP| MCPPOLL[ask_human tool<br/>polls up to 20s]
    WAITING -->|Webhook| PASSIVE[Agent continues work<br/>webhook fires on completion]

    POLL --> CHECK_STATUS{Request<br/>status?}
    LONGPOLL --> CHECK_STATUS
    MCPPOLL --> CHECK_STATUS

    CHECK_STATUS -->|pending| EXPIRED_CHECK{Past<br/>expires_at?}
    EXPIRED_CHECK -->|No| STILL_PENDING[Return pending<br/>agent retries]
    EXPIRED_CHECK -->|Yes| MARK_EXPIRED[Update status: expired]
    MARK_EXPIRED --> RETURN_EXPIRED[Return expired]

    CHECK_STATUS -->|completed| RETURN_COMPLETE[Return completed<br/>selected, selected_label,<br/>responded_at]
    CHECK_STATUS -->|expired| RETURN_EXPIRED

    STILL_PENDING -.->|retry| WAITING

    subgraph human_review["Human Review Flow"]
        EMAIL_RECV([Human receives email]) --> CLICK[Click review link<br/>/review/uuid]
        CLICK --> LOAD[Load review page<br/>show content + choices]
        LOAD --> CHOOSE{Human picks<br/>an option}
        CHOOSE --> SUBMIT[PATCH /api/requests/id<br/>selected_option: choice_id]
        SUBMIT --> ALREADY_DONE{Already completed<br/>or expired?}
        ALREADY_DONE -->|Yes| CONFLICT[409 or 410 error]
        ALREADY_DONE -->|No| UPDATE[Update Supabase<br/>status: completed<br/>selected: choice_id]
        UPDATE --> WEBHOOK{callback_url<br/>configured?}
        WEBHOOK -->|Yes| FIRE_WEBHOOK[POST signed payload<br/>to callback_url]
        WEBHOOK -->|No| DONE_HUMAN[Show confirmation]
        FIRE_WEBHOOK --> DONE_HUMAN
    end

    UPDATE -.->|Next poll sees<br/>completed status| CHECK_STATUS

    style REJECT fill:#ff6b6b,color:#fff
    style ERROR fill:#ff6b6b,color:#fff
    style CONFLICT fill:#ff6b6b,color:#fff
    style RETURN_COMPLETE fill:#51cf66,color:#fff
    style RETURN_EXPIRED fill:#ffd43b,color:#333
    style MARK_EXPIRED fill:#ffd43b,color:#333
```
