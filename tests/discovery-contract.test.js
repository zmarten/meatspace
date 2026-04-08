const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(filePath) {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

test('agent and MCP manifests advertise the current tool and request model', () => {
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

test('docs and discovery surfaces do not mention the retired request_type model', () => {
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

test('review UI uses the dedicated review endpoint and metadata affordances', () => {
  const reviewPage = read('src/app/review/[id]/page.tsx');
  const reviewRouteExists = fs.existsSync(path.join(process.cwd(), 'src/app/api/review/[id]/route.ts'));

  assert.equal(reviewRouteExists, true);
  assert.match(reviewPage, /fetch\(`\/api\/review\/\$\{id\}`\)/);
  assert.match(reviewPage, /agent context/);
  assert.match(reviewPage, /Agent recommended/);
});
