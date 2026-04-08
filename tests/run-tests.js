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
  });

  new vm.Script(outputText, { filename: filePath }).runInContext(context);
  return module.exports;
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const contract = loadTsModule(path.join(process.cwd(), 'src', 'lib', 'request-contract.ts'));

run('toPollResponse returns minimal fields', () => {
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

run('toReviewResponse preserves full review context', () => {
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

run('manifests advertise the current tool and request model', () => {
  const agentCard = JSON.parse(read('public/.well-known/agent.json'));
  const mcpManifest = JSON.parse(read('public/.well-known/mcp.json'));

  assert.equal(agentCard.capabilities.interaction_model, 'content_plus_choices');
  assert.equal(agentCard.capabilities.min_choices, 2);
  assert.equal(agentCard.capabilities.max_choices, 4);
  assert.deepEqual(mcpManifest.tools.map(tool => tool.name), ['get_service_status', 'ask_human']);

  const askHuman = mcpManifest.tools.find(tool => tool.name === 'ask_human');
  assert.equal(askHuman.inputSchema.properties.choices.minItems, 2);
  assert.equal(askHuman.inputSchema.properties.choices.maxItems, 4);
});

run('docs no longer mention the retired request_type model', () => {
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

run('review UI uses the dedicated review endpoint and metadata affordances', () => {
  const reviewPage = read('src/app/review/[id]/page.tsx');
  const reviewRouteExists = fs.existsSync(path.join(process.cwd(), 'src/app/api/review/[id]/route.ts'));

  assert.equal(reviewRouteExists, true);
  assert.match(reviewPage, /fetch\(`\/api\/review\/\$\{id\}`\)/);
  assert.match(reviewPage, /agent context/);
  assert.match(reviewPage, /Agent recommended/);
});

if (process.exitCode) {
  process.exit(process.exitCode);
}

