// HITL Service - Shared Types

export type RequestType = 'approve_reject' | 'choose_option' | 'free_text' | 'rate' | 'rank';
export type RequestStatus = 'pending' | 'in_review' | 'completed' | 'expired' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high' | 'critical';
export type CallbackMethod = 'webhook' | 'poll';
export type EffortTier = 'binary' | 'choice' | 'text';
export type PaymentMethod = 'x402' | 'api_key' | 'free_tier' | 'mcp';

export interface HitlOption {
  id: string;
  label: string;
  description?: string;
}

export interface HitlRequest {
  id: string;
  api_key_id: string | null;
  agent_name: string;
  agent_context?: string;
  request_type: RequestType;
  title: string;
  description?: string;
  payload: Record<string, any>;
  options: HitlOption[];
  priority: Priority;
  tags: string[];
  category?: string;
  callback_method: CallbackMethod;
  callback_url?: string;
  timeout_seconds: number;
  expires_at?: string;
  status: RequestStatus;
  response?: HitlResponse;
  responded_at?: string;
  response_time_ms?: number;
  created_at: string;
  updated_at: string;
  // v2 fields
  effort_tier?: EffortTier;
  price_usdc?: number;
  payment_method?: PaymentMethod;
  payment_tx_hash?: string;
  payment_verified?: boolean;
}

export interface HitlResponse {
  decision?: 'approved' | 'rejected';
  text?: string;
  selected_option?: string;
  rating?: number;
  ranking?: string[];
  reasoning?: string;
}

// API Request/Response types

export interface CreateRequestBody {
  agent_name: string;
  agent_context?: string;
  request_type: RequestType;
  title: string;
  description?: string;
  payload?: Record<string, any>;
  options?: HitlOption[];
  priority?: Priority;
  tags?: string[];
  category?: string;
  callback_method?: CallbackMethod;
  callback_url?: string;
  timeout_seconds?: number;
}

export interface SubmitResponseBody {
  decision?: 'approved' | 'rejected';
  text?: string;
  selected_option?: string;
  rating?: number;
  ranking?: string[];
  reasoning?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// For the polling response
export interface PollResponse {
  id: string;
  status: RequestStatus;
  response?: HitlResponse;
  responded_at?: string;
}
