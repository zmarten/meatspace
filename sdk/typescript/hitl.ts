/**
 * HITL TypeScript SDK v2.0
 * Human-in-the-Loop Service Client
 * 
 * Features: capacity-aware retries, x402 payment info, demand voting
 */

interface HitlConfig {
  baseUrl: string;
  apiKey?: string;
  autoCheckStatus?: boolean;
  retryOnClosed?: boolean;
  maxRetryWaitMs?: number;
}

interface HitlOption {
  id: string;
  label: string;
  description?: string;
}

interface HitlResult {
  requestId: string;
  status: string;
  decision?: 'approved' | 'rejected';
  text?: string;
  selectedOption?: string;
  rating?: number;
  ranking?: string[];
  reasoning?: string;
  respondedAt?: string;
  effortTier?: string;
  priceUsdc?: number;
}

interface ServiceStatus {
  is_open: boolean;
  closes_at?: string;
  opens_at?: string;
  pricing: any[];
  queue: { depth: any[]; daily_remaining: number };
  response_targets: Record<string, string>;
  expertise: any[];
  stats: Record<string, any>;
}

interface BaseParams {
  agentName: string;
  title: string;
  description?: string;
  agentContext?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  tags?: string[];
  wait?: boolean;
  timeoutMs?: number;
}

interface ChooseParams extends BaseParams {
  options: HitlOption[];
}

export class HitlServiceClosed extends Error {
  opensAt?: string;
  constructor(message: string, opensAt?: string) {
    super(message);
    this.name = 'HitlServiceClosed';
    this.opensAt = opensAt;
  }
}

export class HitlQueueFull extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HitlQueueFull';
  }
}

export class HitlClient {
  private baseUrl: string;
  private apiKey?: string;
  private autoCheckStatus: boolean;
  private retryOnClosed: boolean;
  private maxRetryWaitMs: number;
  private headers: Record<string, string>;

  constructor(config: HitlConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.autoCheckStatus = config.autoCheckStatus ?? true;
    this.retryOnClosed = config.retryOnClosed ?? false;
    this.maxRetryWaitMs = config.maxRetryWaitMs ?? 3600_000;
    this.headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) this.headers['Authorization'] = `Bearer ${this.apiKey}`;
  }

  async status(): Promise<ServiceStatus> {
    const res = await fetch(`${this.baseUrl}/api/status`);
    return res.json();
  }

  private async checkOpen(): Promise<void> {
    if (!this.autoCheckStatus) return;
    const st = await this.status();
    if (!st.is_open) {
      throw new HitlServiceClosed(
        st.opens_at ? `Closed. Opens at: ${st.opens_at}` : 'Service is closed',
        st.opens_at
      );
    }
  }

  private async waitForOpen(): Promise<void> {
    const deadline = Date.now() + this.maxRetryWaitMs;
    while (Date.now() < deadline) {
      try {
        const st = await this.status();
        if (st.is_open) return;
      } catch {}
      await new Promise(r => setTimeout(r, 30_000));
    }
    throw new Error('HITL service did not open within maxRetryWaitMs');
  }

  private async createRequest(body: Record<string, any>): Promise<any> {
    try {
      await this.checkOpen();
    } catch (e) {
      if (e instanceof HitlServiceClosed && this.retryOnClosed) {
        await this.waitForOpen();
      } else throw e;
    }

    const res = await fetch(`${this.baseUrl}/api/requests`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (res.status === 503) {
      const data = await res.json();
      if (this.retryOnClosed) {
        await new Promise(r => setTimeout(r, 60_000));
        return this.createRequest(body);
      }
      throw new HitlServiceClosed(data.message || 'Service unavailable', data.opens_at);
    }

    if (res.status === 402) {
      const data = await res.json();
      throw new Error(`Payment required: ${JSON.stringify(data.payment_required?.pricing)}`);
    }

    const json = await res.json();
    if (!json.success) throw new Error(`HITL error: ${json.error}`);
    return json.data;
  }

  private async waitForResponse(requestId: string, timeoutMs = 300_000): Promise<HitlResult> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const res = await fetch(
        `${this.baseUrl}/api/requests/${requestId}/wait?timeout=30000`,
        { headers: this.headers }
      );
      const json = await res.json();
      const data = json.data;
      if (data.status !== 'pending') {
        return {
          requestId: data.id, status: data.status,
          decision: data.response?.decision, text: data.response?.text,
          selectedOption: data.response?.selected_option,
          rating: data.response?.rating, ranking: data.response?.ranking,
          reasoning: data.response?.reasoning, respondedAt: data.responded_at,
        };
      }
    }
    throw new Error(`No response within ${timeoutMs}ms`);
  }

  private buildResult(req: any): HitlResult {
    return {
      requestId: req.id, status: 'pending',
      effortTier: req.effort_tier, priceUsdc: req.price_usdc,
    };
  }

  async approveOrReject(params: BaseParams): Promise<HitlResult> {
    const req = await this.createRequest({
      agent_name: params.agentName, request_type: 'approve_reject',
      title: params.title, description: params.description,
      agent_context: params.agentContext, priority: params.priority || 'normal',
      tags: params.tags || [],
    });
    if (params.wait === false) return this.buildResult(req);
    return this.waitForResponse(req.id, params.timeoutMs);
  }

  async chooseOption(params: ChooseParams): Promise<HitlResult> {
    const req = await this.createRequest({
      agent_name: params.agentName, request_type: 'choose_option',
      title: params.title, description: params.description,
      agent_context: params.agentContext, options: params.options,
      priority: params.priority || 'normal', tags: params.tags || [],
    });
    if (params.wait === false) return this.buildResult(req);
    return this.waitForResponse(req.id, params.timeoutMs);
  }

  async ask(params: BaseParams): Promise<HitlResult> {
    const req = await this.createRequest({
      agent_name: params.agentName, request_type: 'free_text',
      title: params.title, description: params.description,
      agent_context: params.agentContext, priority: params.priority || 'normal',
      tags: params.tags || [],
    });
    if (params.wait === false) return this.buildResult(req);
    return this.waitForResponse(req.id, params.timeoutMs);
  }

  async rate(params: BaseParams): Promise<HitlResult> {
    const req = await this.createRequest({
      agent_name: params.agentName, request_type: 'rate',
      title: params.title, description: params.description,
      agent_context: params.agentContext, priority: params.priority || 'normal',
    });
    if (params.wait === false) return this.buildResult(req);
    return this.waitForResponse(req.id, params.timeoutMs);
  }

  async rank(params: ChooseParams): Promise<HitlResult> {
    const req = await this.createRequest({
      agent_name: params.agentName, request_type: 'rank',
      title: params.title, description: params.description,
      agent_context: params.agentContext, options: params.options,
      priority: params.priority || 'normal',
    });
    if (params.wait === false) return this.buildResult(req);
    return this.waitForResponse(req.id, params.timeoutMs);
  }

  // ─── Demand voting ───

  async listExpertise(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/expertise`);
    const json = await res.json();
    return json.data;
  }

  async voteExpertise(params: {
    categorySlug: string;
    agentName: string;
    useCase?: string;
    willingnessToPay?: number;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/expertise`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        agent_name: params.agentName,
        category_slug: params.categorySlug,
        use_case: params.useCase,
        willingness_to_pay: params.willingnessToPay,
      }),
    });
    return res.json();
  }

  async proposeExpertise(params: {
    proposedName: string;
    agentName: string;
    proposedDescription?: string;
    useCase?: string;
    willingnessToPay?: number;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/expertise`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        agent_name: params.agentName,
        proposed_name: params.proposedName,
        proposed_description: params.proposedDescription,
        use_case: params.useCase,
        willingness_to_pay: params.willingnessToPay,
      }),
    });
    return res.json();
  }
}
