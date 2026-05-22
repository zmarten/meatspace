const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function read(filePath) {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

function loadTsModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filePath,
  });

  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    require,
    __dirname: path.dirname(filePath),
    __filename: filePath,
    console,
    process,
    crypto,
    TextEncoder,
    URL,
    atob,
    btoa,
  });

  new vm.Script(outputText, { filename: filePath }).runInContext(context);
  return module.exports;
}

async function run(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

async function main() {
  const contract = loadTsModule(path.join(process.cwd(), 'src', 'lib', 'request-contract.ts'));
  const auth = loadTsModule(path.join(process.cwd(), 'src', 'lib', 'auth.ts'));

  await run('toPollResponse returns minimal fields', async () => {
    const response = contract.toPollResponse({
      id: 'req-1',
      agent_name: 'design-agent',
      title: 'Pick one',
      content: '<img src="https://example.com/a.png" />',
      content_type: 'html',
      choices: [
        { id: 'a', label: 'Option A' },
        { id: 'b', label: 'Option B' },
      ],
      metadata: { decision_reason: 'taste check' },
      status: 'completed',
      selected: 'b',
      responded_at: '2026-04-07T18:10:00.000Z',
      expires_at: '2026-04-07T19:00:00.000Z',
      created_at: '2026-04-07T17:55:00.000Z',
    });

    assert.equal(JSON.stringify(response), JSON.stringify({
      id: 'req-1',
      status: 'completed',
      selected: 'b',
      selected_label: 'Option B',
      responded_at: '2026-04-07T18:10:00.000Z',
      expires_at: '2026-04-07T19:00:00.000Z',
    }));
    assert.equal(Object.hasOwn(response, 'content'), false);
    assert.equal(Object.hasOwn(response, 'choices'), false);
    assert.equal(Object.hasOwn(response, 'metadata'), false);
  });

  await run('toReviewResponse preserves full review context', async () => {
    const response = contract.toReviewResponse({
      id: 'req-2',
      agent_name: 'deploy-bot',
      title: 'Ship this rollout?',
      content: 'Release v2.3.0 is ready.',
      content_type: 'text',
      choices: [
        { id: 'canary', label: 'Canary' },
        { id: 'rolling', label: 'Rolling update' },
      ],
      metadata: {
        decision_reason: 'Needs human approval before production deploy.',
        confidence: 0.21,
        recommended_option: 'canary',
      },
      status: 'pending',
      selected: null,
      responded_at: null,
      expires_at: '2026-04-07T19:00:00.000Z',
      created_at: '2026-04-07T17:55:00.000Z',
    });

    assert.equal(response.agent_name, 'deploy-bot');
    assert.equal(response.choices.length, 2);
    assert.equal(response.metadata.recommended_option, 'canary');
    assert.equal(response.selected_label, null);
  });

  await run('auth helpers enforce allowlisted webhooks and signed sessions', async () => {
    process.env.WEBHOOK_ALLOWED_HOSTS = 'example.com,api.example.com';
    process.env.ADMIN_SESSION_SECRET = 'session-secret';

    assert.equal(auth.isAllowedCallbackUrl('https://example.com/hook'), true);
    assert.equal(auth.isAllowedCallbackUrl('https://api.example.com/hook'), true);
    assert.equal(auth.isAllowedCallbackUrl('https://evil.example.net/hook'), false);
    assert.equal(auth.isAllowedCallbackUrl('http://example.com/hook'), false);

    const sessionValue = await auth.createAdminSessionValue();
    assert.equal(typeof sessionValue, 'string');
    assert.equal(await auth.validateAdminSession(sessionValue), true);

    const [payload, signature] = sessionValue.split('.');
    assert.equal(await auth.validateAdminSession(`${payload}.tampered${signature}`), false);

    const tokenHash = await auth.hashReviewToken('opaque-review-token');
    assert.equal(await auth.reviewTokenMatches('opaque-review-token', tokenHash), true);
    assert.equal(await auth.reviewTokenMatches('wrong-token', tokenHash), false);
  });

  await run('manifests advertise the current tool and request model', async () => {
    const agentCard = JSON.parse(read('public/.well-known/agent.json'));
    const mcpManifest = JSON.parse(read('public/.well-known/mcp.json'));

    assert.equal(agentCard.capabilities.interaction_model, 'content_plus_choices');
    assert.equal(agentCard.capabilities.min_choices, 2);
    assert.equal(agentCard.capabilities.max_choices, 4);
    assert.deepEqual(mcpManifest.tools.map(tool => tool.name), ['get_service_status', 'provision_api_key', 'ask_human']);

    const provisionApiKey = mcpManifest.tools.find(tool => tool.name === 'provision_api_key');
    assert.ok(provisionApiKey, 'provision_api_key tool should be present');
    assert.deepEqual(provisionApiKey.inputSchema.required, ['name', 'email']);

    const askHuman = mcpManifest.tools.find(tool => tool.name === 'ask_human');
    assert.ok(askHuman, 'ask_human tool should be present');
    assert.equal(askHuman.inputSchema.properties.choices.minItems, 2);
    assert.equal(askHuman.inputSchema.properties.choices.maxItems, 4);
  });

  await run('docs no longer mention the retired request_type model', async () => {
    const surfaces = [
      'README.md',
      'docs/API.md',
      'public/llms.txt',
      'public/llms-full.txt',
      'public/.well-known/agent.json',
      'public/.well-known/mcp.json',
    ].map(read);

    for (const text of surfaces) {
      assert.equal(text.includes('request_type'), false);
      assert.equal(text.includes('approve_reject'), false);
      assert.equal(text.includes('free_text'), false);
      assert.equal(text.includes('ask_human_choice'), false);
    }
  });

  await run('review UI and routes require review tokens', async () => {
    const reviewPage = read('src/app/review/[id]/page.tsx');
    const reviewRoute = read('src/app/api/review/[id]/route.ts');
    const requestRoute = read('src/app/api/requests/[id]/route.ts');

    assert.match(reviewPage, /fetch\(`\/api\/review\/\$\{id\}`,\s*\{/);
    assert.match(reviewPage, /x-review-token/);
    assert.match(reviewRoute, /reviewTokenMatches/);
    assert.match(requestRoute, /\.eq\('status', 'pending'\)/);
  });

  await run('requests list endpoint requires admin authentication', async () => {
    const requestsRoute = read('src/app/api/requests/route.ts');

    assert.match(requestsRoute, /validateAdminSession/);
    assert.match(requestsRoute, /hitl_admin_session/);
    assert.match(requestsRoute, /Unauthorized: admin session required/);
    assert.match(requestsRoute, /status: 401/);
  });

  await run('TypeScript SDK authenticates poll and long-poll requests', async () => {
    const sdk = read('sdk/typescript/hitl.ts');

    assert.match(sdk, /fetch\(`\$\{this\.baseUrl\}\/api\/requests\/\$\{requestId\}`,[\s\S]*?headers: this\.headers/);
    assert.match(sdk, /fetch\([\s\S]*?`\$\{this\.baseUrl\}\/api\/requests\/\$\{requestId\}\/wait\?timeout=30000`,[\s\S]*?headers: this\.headers/);
  });

  await run('docs reflect tokenized review URLs and hardened webhook policy', async () => {
    const tokenizedReviewSurfaces = [
      'README.md',
      'docs/API.md',
      'public/llms-full.txt',
      'public/agents.md',
      'src/app/docs/page.tsx',
    ].map(read);

    for (const text of tokenizedReviewSurfaces) {
      assert.equal(text.includes('opaque-review-token'), true);
    }

    const hardenedWebhookSurfaces = [
      ...tokenizedReviewSurfaces,
      read('src/app/api/openapi/route.ts'),
    ];

    for (const text of hardenedWebhookSurfaces) {
      const normalized = text.toLowerCase();
      assert.equal(
        normalized.includes('callback_url_not_allowed') ||
          normalized.includes('allowlisted') ||
          normalized.includes('allowlist'),
        true
      );
    }

    const dashboardHook = read('src/hooks/useHitl.ts');
    assert.equal(dashboardHook.includes('NEXT_PUBLIC_ADMIN_SECRET'), false);
  });

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
