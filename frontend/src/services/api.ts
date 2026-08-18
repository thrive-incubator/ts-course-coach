import type { Proposal } from '../types/proposal';

let API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function initApiBase() {
  try {
    const res = await fetch('/api/v1/config');
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.api_base_url) {
        API_BASE = cfg.api_base_url.replace(/\/$/, '') + '/api/v1';
      }
    }
  } catch {
    // fall through to default
  }
}

// Kick off (best-effort) on module load; components can still fetch before this resolves.
initApiBase();

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function checkHealth() {
  const backendBase = API_BASE.replace(/\/api\/v1\/?$/, '');
  return fetch(`${backendBase}/health`).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  });
}

// ---- Coach ----------------------------------------------------------------

export interface CoachResponse {
  suggestion: string;
  examples: string[];
  tone: string;
}

export function getCoachSuggestion(payload: {
  section: string;
  field: string;
  current_value: string;
  course_context: Record<string, string>;
}) {
  return apiFetch<CoachResponse>('/coach', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ---- Marketing Brief -------------------------------------------------------

export interface Persona {
  name: string;
  context: string;
  trigger: string;
  objection: string;
}
export interface ChannelIdea {
  name: string;
  why: string;
  message_angle: string;
}
export interface MarketingBrief {
  audience_personas: Persona[];
  value_propositions: string[];
  positioning_statement: string;
  headlines: string[];
  channels: ChannelIdea[];
  social_copy: { linkedin_post?: string; twitter_thread_opener?: string; instagram_caption?: string };
  subject_lines: string[];
}

export function generateMarketingBrief(proposal: Proposal) {
  return apiFetch<MarketingBrief>('/proposal/marketing-brief', {
    method: 'POST',
    body: JSON.stringify({ data: proposal }),
  });
}

// ---- Export ---------------------------------------------------------------

export function exportProposal(proposal: Proposal) {
  return apiFetch<{ markdown: string }>('/proposal/export', {
    method: 'POST',
    body: JSON.stringify({ data: proposal }),
  });
}
