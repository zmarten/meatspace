// MeatSpace HITL Service — Shared Types

// === Core Domain Types ===

export type RequestStatus = 'pending' | 'completed' | 'expired';

export type ContentType = 'html' | 'image' | 'text' | 'markdown';

export interface Choice {
  id: string;
  label: string;
}

export interface HitlRequest {
  id: string;
  agent_name: string;
  title: string;
  content: string | null;
  content_type: ContentType;
  choices: Choice[];
  callback_url: string | null;
  metadata: Record<string, unknown>;
  status: RequestStatus;
  selected: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// === API Request/Response Types ===

export interface CreateRequestBody {
  agent_name: string;
  title: string;
  content?: string;
  content_type?: ContentType;
  choices: Choice[];
  callback_url?: string;
  metadata?: Record<string, unknown>;
  decision_reason?: string;
  confidence?: number;
  consequence_of_wrong_choice?: string;
  recommended_option?: string;
  run_id?: string;
  trace_id?: string;
  timeout_seconds?: number;
}

export interface SubmitResponseBody {
  selected_option: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface CreateRequestResponse {
  id: string;
  status: RequestStatus;
  review_url: string;
  poll_url: string;
  expires_at: string;
}

export interface PollResponse {
  id: string;
  status: RequestStatus;
  selected: string | null;
  selected_label?: string | null;
  responded_at: string | null;
  expires_at?: string | null;
}
