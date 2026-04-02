import { createServiceClient } from './supabase';
import { EffortTier, OperatingConfig } from '@/types';

interface CapacityStatus {
  is_open: boolean;
  reason?: string;
  closes_at?: string;
  opens_at?: string;
  queue_available: {
    binary: number;
    choice: number;
    text: number;
  };
  daily_remaining: number;
  estimated_response_seconds: {
    binary: number;
    choice: number;
    text: number;
  };
}

// Map request_type to effort_tier
export function getEffortTier(requestType: string): EffortTier {
  switch (requestType) {
    case 'approve_reject':
    case 'rate':
      return 'binary';
    case 'choose_option':
    case 'rank':
      return 'choice';
    case 'free_text':
      return 'text';
    default:
      return 'binary';
  }
}

// Get current time in operator's timezone
function getNowInTimezone(tz: string): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
}

// Parse "HH:MM" to minutes since midnight
function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Check if currently within operating hours
function isWithinSchedule(config: OperatingConfig): { open: boolean; nextOpen?: string; closesAt?: string } {
  if (config.force_closed) return { open: false };
  if (config.force_open) return { open: true };

  const now = getNowInTimezone(config.timezone);
  const dayOfWeek = now.getDay(); // 0=Sunday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaySchedule = config.weekly_schedule.find(s => s.day === dayOfWeek);

  if (!todaySchedule || !todaySchedule.enabled) {
    // Find next open day
    const nextOpen = findNextOpenTime(config, dayOfWeek);
    return { open: false, nextOpen };
  }

  const openMinutes = parseTime(todaySchedule.open);
  const closeMinutes = parseTime(todaySchedule.close);

  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    // Currently open — calculate close time
    const closeHour = Math.floor(closeMinutes / 60);
    const closeMin = closeMinutes % 60;
    const closesAt = `${closeHour.toString().padStart(2, '0')}:${closeMin.toString().padStart(2, '0')} ${config.timezone}`;
    return { open: true, closesAt };
  }

  if (currentMinutes < openMinutes) {
    // Before opening today
    const openHour = Math.floor(openMinutes / 60);
    const openMin = openMinutes % 60;
    return { open: false, nextOpen: `Today at ${openHour.toString().padStart(2, '0')}:${openMin.toString().padStart(2, '0')} ${config.timezone}` };
  }

  // After closing today
  const nextOpen = findNextOpenTime(config, dayOfWeek);
  return { open: false, nextOpen };
}

function findNextOpenTime(config: OperatingConfig, currentDay: number): string {
  for (let offset = 1; offset <= 7; offset++) {
    const checkDay = (currentDay + offset) % 7;
    const schedule = config.weekly_schedule.find(s => s.day === checkDay);
    if (schedule?.enabled) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `${dayNames[checkDay]} at ${schedule.open} ${config.timezone}`;
    }
  }
  return 'Unknown';
}

// Main capacity check
export async function checkCapacity(effortTier: EffortTier): Promise<CapacityStatus> {
  const supabase = createServiceClient();

  // Get operating config
  const { data: configData } = await supabase
    .from('hitl_operating_config')
    .select('*')
    .limit(1)
    .single();

  const config = configData as OperatingConfig;
  if (!config) {
    return {
      is_open: false,
      reason: 'Service not configured',
      queue_available: { binary: 0, choice: 0, text: 0 },
      daily_remaining: 0,
      estimated_response_seconds: { binary: 300, choice: 600, text: 900 },
    };
  }

  // Check operating hours
  const schedule = isWithinSchedule(config);

  if (!schedule.open) {
    return {
      is_open: false,
      reason: config.closed_message,
      opens_at: schedule.nextOpen,
      queue_available: { binary: 0, choice: 0, text: 0 },
      daily_remaining: 0,
      estimated_response_seconds: {
        binary: config.target_response_binary,
        choice: config.target_response_choice,
        text: config.target_response_text,
      },
    };
  }

  // Check queue depth per tier
  const { data: queueData } = await supabase
    .from('hitl_queue_depth')
    .select('*');

  const queueDepth: Record<string, number> = {};
  (queueData || []).forEach((row: any) => {
    queueDepth[row.effort_tier] = row.pending_count;
  });

  const pendingBinary = queueDepth['binary'] || 0;
  const pendingChoice = queueDepth['choice'] || 0;
  const pendingText = queueDepth['text'] || 0;

  const availBinary = Math.max(0, config.max_pending_binary - pendingBinary);
  const availChoice = Math.max(0, config.max_pending_choice - pendingChoice);
  const availText = Math.max(0, config.max_pending_text - pendingText);

  // Check daily cap
  const { data: statsData } = await supabase
    .from('hitl_stats')
    .select('daily_request_count')
    .single();

  const dailyCount = (statsData as any)?.daily_request_count || 0;
  const dailyRemaining = Math.max(0, config.max_daily_requests - dailyCount);

  // Is the specific tier available?
  const tierAvailable = effortTier === 'binary' ? availBinary > 0
    : effortTier === 'choice' ? availChoice > 0
    : availText > 0;

  const is_open = tierAvailable && dailyRemaining > 0;

  let reason: string | undefined;
  if (!tierAvailable) {
    reason = `Queue full for ${effortTier} tier. Currently ${effortTier === 'binary' ? pendingBinary : effortTier === 'choice' ? pendingChoice : pendingText} pending requests.`;
  } else if (dailyRemaining <= 0) {
    reason = 'Daily request limit reached. Try again tomorrow.';
  }

  return {
    is_open,
    reason,
    closes_at: schedule.closesAt,
    queue_available: {
      binary: availBinary,
      choice: availChoice,
      text: availText,
    },
    daily_remaining: dailyRemaining,
    estimated_response_seconds: {
      binary: config.target_response_binary * ((pendingBinary || 0) + 1),
      choice: config.target_response_choice * ((pendingChoice || 0) + 1),
      text: config.target_response_text * ((pendingText || 0) + 1),
    },
  };
}

// Get full status for the public API
export async function getServiceStatus() {
  const supabase = createServiceClient();

  const { data: config } = await supabase
    .from('hitl_operating_config')
    .select('*')
    .limit(1)
    .single();

  if (!config) return { is_open: false, reason: 'Not configured' };

  const schedule = isWithinSchedule(config as OperatingConfig);

  const { data: pricing } = await supabase
    .from('hitl_pricing')
    .select('*')
    .eq('is_active', true)
    .order('price_usdc');

  const { data: queueData } = await supabase
    .from('hitl_queue_depth')
    .select('*');

  const { data: stats } = await supabase
    .from('hitl_stats')
    .select('*')
    .single();

  const { data: expertise } = await supabase
    .from('hitl_expertise_categories')
    .select('slug, name, description, vote_count, is_available')
    .order('vote_count', { ascending: false });

  return {
    service: 'hitl',
    version: '1.0.0',
    operator: 'Zach Martens',
    is_open: schedule.open,
    closes_at: schedule.closesAt,
    opens_at: schedule.nextOpen,
    timezone: (config as OperatingConfig).timezone,
    pricing: pricing || [],
    queue: {
      depth: queueData || [],
      daily_remaining: Math.max(0, (config as OperatingConfig).max_daily_requests - ((stats as any)?.daily_request_count || 0)),
    },
    response_targets: {
      binary: `${(config as OperatingConfig).target_response_binary}s`,
      choice: `${(config as OperatingConfig).target_response_choice}s`,
      text: `${(config as OperatingConfig).target_response_text}s`,
    },
    expertise: expertise || [],
    stats: {
      completed_requests: (stats as any)?.completed_count || 0,
      avg_response_time_ms: Math.round((stats as any)?.avg_response_time_ms || 0),
      unique_agents: (stats as any)?.unique_agents || 0,
    },
  };
}
