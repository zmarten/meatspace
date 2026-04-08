const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

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

const contract = loadTsModule(
  path.join(process.cwd(), 'src', 'lib', 'request-contract.ts')
);

test('toPollResponse returns only the minimal agent-facing fields', () => {
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

  assert.deepEqual(response, {
    id: 'req-1',
    status: 'completed',
    selected: 'b',
    selected_label: 'Option B',
    responded_at: '2026-04-07T18:10:00.000Z',
    expires_at: '2026-04-07T19:00:00.000Z',
  });
  assert.equal(Object.hasOwn(response, 'content'), false);
  assert.equal(Object.hasOwn(response, 'choices'), false);
  assert.equal(Object.hasOwn(response, 'metadata'), false);
});

test('toReviewResponse preserves full review context and metadata', () => {
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
