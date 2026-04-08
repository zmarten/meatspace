export interface RequestChoice {
  id: string;
  label: string;
}

export interface RequestRowLike {
  id: string;
  agent_name: string;
  title: string;
  content: string | null;
  content_type: string | null;
  choices: RequestChoice[] | null;
  metadata: Record<string, unknown> | null;
  status: string;
  selected: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at?: string | null;
}

export function getSelectedLabel(
  choices: RequestChoice[] | null | undefined,
  selected: string | null | undefined
) {
  if (!selected) return null;
  return choices?.find(choice => choice.id === selected)?.label ?? null;
}

export function toPollResponse(row: RequestRowLike) {
  return {
    id: row.id,
    status: row.status,
    selected: row.selected,
    selected_label: getSelectedLabel(row.choices, row.selected),
    responded_at: row.responded_at,
    expires_at: row.expires_at,
  };
}

export function toReviewResponse(row: RequestRowLike) {
  return {
    id: row.id,
    agent_name: row.agent_name,
    title: row.title,
    content: row.content,
    content_type: row.content_type,
    choices: row.choices ?? [],
    metadata: row.metadata ?? {},
    status: row.status,
    selected: row.selected,
    selected_label: getSelectedLabel(row.choices, row.selected),
    responded_at: row.responded_at,
    expires_at: row.expires_at,
    created_at: row.created_at ?? null,
  };
}
