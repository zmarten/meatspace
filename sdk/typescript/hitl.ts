/**
 * MeatSpace TypeScript SDK
 * Flesh-in-the-loop for autonomous agents.
 *
 * npm install @meatspace/sdk
 *
 * Usage:
 *   import { MeatSpace } from '@meatspace/sdk';
 *
 *   const ms = new MeatSpace({
 *     baseUrl: 'https://meatspace.app',
 *     apiKey: 'hitl_...',
 *   });
 *
 *   const result = await ms.ask({
 *     agentName: 'my-agent',
 *     title: 'Which hero image?',
 *     content: '<img src="https://example.com/a.png"/>',
 *     contentType: 'html',
 *     choices: [
 *       { id: 'a', label: 'Option A' },
 *       { id: 'b', label: 'Option B' },
 *     ],
 *   });
 *
 *   console.log(result.selected); // 'a' or 'b'
 */

export interface MeatSpaceConfig {
  /** Base URL of the MeatSpace instance */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
}

export interface Choice {
  id: string;
  label: string;
}

export interface AskParams {
  /** Your agent/tool name (max 100 chars) */
  agentName: string;
  /** Short title for the request (max 200 chars) */
  title: string;
  /** Content for human review — text, markdown, HTML, or image URL (max 50KB) */
  content?: string;
  /** How to render content: text, markdown, html, image (default: text) */
  contentType?: 'text' | 'markdown' | 'html' | 'image';
  /** 2-4 choices for the human to pick from */
  choices: Choice[];
  /** HTTPS webhook URL for async notification */
  callbackUrl?: string;
  /** Arbitrary metadata passed through to webhook (max 10KB) */
  metadata?: Record<string, unknown>;
  /** Why the agent is escalating this to a human */
  decisionReason?: string;
  /** Agent confidence between 0 and 1 */
  confidence?: number;
  /** Why a wrong choice would matter */
  consequenceOfWrongChoice?: string;
  /** Optional choice id the agent recommends */
  recommendedOption?: string;
  /** Optional workflow run identifier */
  runId?: string;
  /** Optional trace identifier */
  traceId?: string;
  /** Request expiry in seconds (default 3600, max 86400) */
  timeoutSeconds?: number;
  /** Whether to block until the human responds (default: true) */
  wait?: boolean;
  /** Max time to wait in ms when wait=true (default: 300000 = 5 min) */
  waitTimeoutMs?: number;
}

export interface AskResult {
  /** Request UUID */
  requestId: string;
  /** pending, completed, or expired */
  status: 'pending' | 'completed' | 'expired';
  /** The choice id the human selected (null if pending/expired) */
  selected: string | null;
  /** Human-readable label for the selected choice */
  selectedLabel: string | null;
  /** ISO timestamp of when the human responded */
  respondedAt: string | null;
  /** ISO timestamp of when the request expires */
  expiresAt: string | null;
  /** URL where the human reviews the request */
  reviewUrl: string;
  /** Polling endpoint */
  pollUrl: string;
}

export class MeatSpaceError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'MeatSpaceError';
    this.status = status;
    this.code = code;
  }
}

export class MeatSpace {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: MeatSpaceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
  }

  /**
   * Submit content and choices to a human, optionally blocking until they respond.
   */
  async ask(params: AskParams): Promise<AskResult> {
    const res = await fetch(`${this.baseUrl}/api/requests`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        agent_name: params.agentName,
        title: params.title,
        content: params.content,
        content_type: params.contentType,
        choices: params.choices,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
        decision_reason: params.decisionReason,
        confidence: params.confidence,
        consequence_of_wrong_choice: params.consequenceOfWrongChoice,
        recommended_option: params.recommendedOption,
        run_id: params.runId,
        trace_id: params.traceId,
        timeout_seconds: params.timeoutSeconds,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new MeatSpaceError(body.error || `HTTP ${res.status}`, res.status, body.code);
    }

    const json = await res.json();
    if (!json.success) throw new MeatSpaceError(json.error, 400, json.code);

    const data = json.data;
    const result: AskResult = {
      requestId: data.id,
      status: 'pending',
      selected: null,
      selectedLabel: null,
      respondedAt: null,
      expiresAt: data.expires_at ?? null,
      reviewUrl: data.review_url,
      pollUrl: data.poll_url,
    };

    if (params.wait === false) return result;

    return this.waitForResponse(data.id, params.waitTimeoutMs ?? 300_000, result);
  }

  /**
   * Poll a request's current status (non-blocking).
   */
  async poll(requestId: string): Promise<AskResult> {
    const res = await fetch(`${this.baseUrl}/api/requests/${requestId}`);
    const json = await res.json();
    if (!json.success) throw new MeatSpaceError(json.error || 'Not found', res.status);
    const d = json.data;
    return {
      requestId: d.id,
      status: d.status,
      selected: d.selected,
      selectedLabel: d.selected_label ?? null,
      respondedAt: d.responded_at,
      expiresAt: d.expires_at ?? null,
      reviewUrl: `${this.baseUrl}/review/${d.id}`,
      pollUrl: `/api/requests/${d.id}`,
    };
  }

  private async waitForResponse(
    requestId: string,
    timeoutMs: number,
    initial: AskResult,
  ): Promise<AskResult> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const res = await fetch(
        `${this.baseUrl}/api/requests/${requestId}/wait?timeout=30000`,
      );
      const json = await res.json();
      const d = json.data;
      if (d.status !== 'pending') {
        return {
          ...initial,
          status: d.status,
          selected: d.selected,
          selectedLabel: d.selected_label ?? null,
          respondedAt: d.responded_at,
          expiresAt: d.expires_at ?? initial.expiresAt,
        };
      }
    }
    return initial; // still pending after timeout
  }
}
