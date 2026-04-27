/**
 * MeatSpace Browser SDK v0.1.0
 * Human-in-the-loop for AI agents.
 * https://meatspace.run
 *
 * @example
 * const ms = new MeatSpace({ apiKey: 'hitl_...' });
 * const result = await ms.ask({
 *   agentName: 'my-agent',
 *   title: 'Which option?',
 *   choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
 * });
 * console.log(result.selected); // 'a' or 'b'
 */

export class MeatSpace {
  /**
   * @param {object} [opts]
   * @param {string} [opts.baseUrl='https://meatspace.run']
   * @param {string|null} [opts.apiKey=null]
   */
  constructor({ baseUrl = 'https://meatspace.run', apiKey = null } = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  /**
   * Provision an API key instantly. No auth required.
   * @param {object} opts
   * @param {string} opts.name - Agent or tool name
   * @param {string} opts.email - Owner email
   * @returns {Promise<{id: string, name: string, key_prefix: string, api_key: string}>}
   */
  async getKey({ name, email }) {
    const res = await fetch(`${this.baseUrl}/api/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to provision key');
    this.apiKey = json.data.api_key;
    return json.data;
  }

  /**
   * Create a human review request.
   * @param {object} opts
   * @param {string} opts.agentName
   * @param {string} opts.title
   * @param {Array<{id: string, label: string}>} opts.choices
   * @param {string} [opts.content]
   * @param {string} [opts.contentType]
   * @param {string} [opts.decisionReason]
   * @param {number} [opts.confidence]
   * @param {string} [opts.consequenceOfWrongChoice]
   * @param {string} [opts.recommendedOption]
   * @param {string} [opts.callbackUrl]
   * @param {object} [opts.metadata]
   * @param {string} [opts.runId]
   * @param {string} [opts.traceId]
   * @param {number} [opts.timeoutSeconds]
   * @returns {Promise<{id: string, status: string, review_url: string, poll_url: string, expires_at: string}>}
   */
  async createRequest({
    agentName,
    title,
    choices,
    content,
    contentType,
    decisionReason,
    confidence,
    consequenceOfWrongChoice,
    recommendedOption,
    callbackUrl,
    metadata,
    runId,
    traceId,
    timeoutSeconds,
  }) {
    if (!this.apiKey) throw new Error('No API key set. Call getKey() first or pass apiKey to constructor.');

    const body = { agent_name: agentName, title, choices };
    if (content !== undefined) body.content = content;
    if (contentType !== undefined) body.content_type = contentType;
    if (decisionReason !== undefined) body.decision_reason = decisionReason;
    if (confidence !== undefined) body.confidence = confidence;
    if (consequenceOfWrongChoice !== undefined) body.consequence_of_wrong_choice = consequenceOfWrongChoice;
    if (recommendedOption !== undefined) body.recommended_option = recommendedOption;
    if (callbackUrl !== undefined) body.callback_url = callbackUrl;
    if (metadata !== undefined) body.metadata = metadata;
    if (runId !== undefined) body.run_id = runId;
    if (traceId !== undefined) body.trace_id = traceId;
    if (timeoutSeconds !== undefined) body.timeout_seconds = timeoutSeconds;

    const res = await fetch(`${this.baseUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create request');
    return json.data;
  }

  /**
   * Poll for a request's current status.
   * @param {string} requestId
   * @returns {Promise<{id: string, status: string, selected: string|null, selected_label: string|null, responded_at: string|null, expires_at: string|null}>}
   */
  async pollResult(requestId) {
    if (!this.apiKey) throw new Error('No API key set.');
    const res = await fetch(`${this.baseUrl}/api/requests/${requestId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to poll request');
    return json.data;
  }

  /**
   * Long-poll: block until the human responds or timeout.
   * @param {string} requestId
   * @param {object} [opts]
   * @param {number} [opts.timeout=25000] - Max wait in ms (server caps at 25000)
   * @returns {Promise<{id: string, status: string, selected: string|null, selected_label: string|null, responded_at: string|null, expires_at: string|null}>}
   */
  async waitForResult(requestId, { timeout = 25000 } = {}) {
    if (!this.apiKey) throw new Error('No API key set.');
    const res = await fetch(
      `${this.baseUrl}/api/requests/${requestId}/wait?timeout=${timeout}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to wait for request');
    return json.data;
  }

  /**
   * Combined: create a request and wait for the result.
   * If the human doesn't respond within a single long-poll cycle, continues polling.
   * @param {object} opts - Same as createRequest
   * @param {number} [opts.maxWaitMs=60000] - Total max wait time
   * @returns {Promise<{id: string, status: string, selected: string|null, selected_label: string|null, responded_at: string|null, expires_at: string|null, review_url: string}>}
   */
  async ask(opts) {
    const maxWaitMs = opts.maxWaitMs || 60000;
    const created = await this.createRequest(opts);
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const result = await this.waitForResult(created.id);
      if (result.status === 'completed' || result.status === 'expired') {
        return { ...result, review_url: created.review_url };
      }
    }

    // Return pending status with review URL so caller can take action
    const latest = await this.pollResult(created.id);
    return { ...latest, review_url: created.review_url };
  }
}

/**
 * Factory function.
 * @param {object} [opts] - Same as MeatSpace constructor
 * @returns {MeatSpace}
 */
export function createClient(opts) {
  return new MeatSpace(opts);
}
