/**
 * In-memory mock data store for local MVP development.
 * Replaces Supabase — no external services needed.
 * Resets every time the dev server restarts.
 */

// Web Crypto globals used — no Node.js crypto import needed in Edge runtime

function hashApiKey(key: string): string {
  // Mock-mode only — not security sensitive, btoa is sufficient
  return btoa(key);
}

// ─── Types for internal rows ───

interface DbRow {
  [key: string]: any;
}

// ─── The store ───

const store: Record<string, DbRow[]> = {
  hitl_requests: [],
  hitl_api_keys: [],
};

// ─── Seed data ───

function seed() {
  const now = new Date().toISOString();
  const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
  const tenMinAgo = new Date(Date.now() - 10 * 60000).toISOString();

  // Default API key (the raw key is "hitl_mock-dev-key-for-local-testing")
  const mockRawKey = 'hitl_mock-dev-key-for-local-testing';
  store.hitl_api_keys = [
    {
      id: 'key-1',
      name: 'Local Dev Key',
      key_hash: hashApiKey(mockRawKey),
      key_prefix: mockRawKey.slice(0, 12),
      agent_name: 'dev-agent',
      is_active: true,
      created_at: now,
      last_used_at: null,
    },
  ];

  // ─── Sample requests (new MVP schema) ───

  store.hitl_requests = [
    {
      id: crypto.randomUUID(),
      agent_name: 'design-agent',
      title: 'Which hero layout for the landing page?',
      content: '<h2>Campaign Landing Page</h2><p>Three layout variants for the Q2 campaign. Each uses the same copy but different visual hierarchies.</p>',
      content_type: 'html',
      choices: [
        { id: 'a', label: 'Left-aligned hero' },
        { id: 'b', label: 'Centered hero' },
        { id: 'c', label: 'Split-screen' },
      ],
      callback_url: null,
      metadata: { campaign: 'q2-2025' },
      status: 'pending',
      selected: null,
      responded_at: null,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      created_at: fiveMinAgo,
      updated_at: fiveMinAgo,
    },
    {
      id: crypto.randomUUID(),
      agent_name: 'content-writer',
      title: 'Which tagline should we use?',
      content: 'We need a tagline for the product launch email. The audience is technical founders.',
      content_type: 'text',
      choices: [
        { id: 'opt-1', label: 'Ship faster with less friction' },
        { id: 'opt-2', label: 'Your stack, your rules' },
        { id: 'opt-3', label: 'Build what matters' },
        { id: 'opt-4', label: 'Less config, more code' },
      ],
      callback_url: null,
      metadata: {},
      status: 'pending',
      selected: null,
      responded_at: null,
      expires_at: new Date(Date.now() + 7200000).toISOString(),
      created_at: tenMinAgo,
      updated_at: tenMinAgo,
    },
    // One completed request
    {
      id: crypto.randomUUID(),
      agent_name: 'deploy-bot',
      title: 'Which deployment strategy?',
      content: 'Release v2.3.0 is ready. Choose the rollout strategy.',
      content_type: 'text',
      choices: [
        { id: 'canary', label: 'Canary (10% → 50% → 100%)' },
        { id: 'blue-green', label: 'Blue-green cutover' },
        { id: 'rolling', label: 'Rolling update' },
      ],
      callback_url: null,
      metadata: { version: '2.3.0' },
      status: 'completed',
      selected: 'canary',
      responded_at: new Date(Date.now() - 3600000).toISOString(),
      expires_at: null,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
}

// Seed on first import
seed();

// ─── Store access functions ───

export function getTable(tableName: string): DbRow[] {
  if (!store[tableName]) {
    store[tableName] = [];
  }
  return store[tableName];
}

export function insertRow(tableName: string, row: DbRow): DbRow {
  const table = getTable(tableName);
  const newRow = {
    id: row.id || crypto.randomUUID(),
    ...row,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
  table.push(newRow);
  return newRow;
}

export function updateRows(
  tableName: string,
  updates: DbRow,
  filters: { column: string; value: any }[]
): DbRow[] {
  const table = getTable(tableName);
  const matched: DbRow[] = [];
  for (const row of table) {
    const match = filters.every((f) => row[f.column] === f.value);
    if (match) {
      Object.assign(row, updates, { updated_at: new Date().toISOString() });
      matched.push(row);
    }
  }
  return matched;
}

export function upsertRow(
  tableName: string,
  row: DbRow,
  conflictColumns: string[]
): DbRow {
  const table = getTable(tableName);
  const existing = table.find((r) =>
    conflictColumns.every((col) => r[col] === row[col])
  );
  if (existing) {
    Object.assign(existing, row, { updated_at: new Date().toISOString() });
    return existing;
  }
  return insertRow(tableName, row);
}

export function deleteRows(
  tableName: string,
  filters: { column: string; value: any }[]
): number {
  const table = getTable(tableName);
  const before = table.length;
  store[tableName] = table.filter(
    (row) => !filters.every((f) => row[f.column] === f.value)
  );
  return before - store[tableName].length;
}
