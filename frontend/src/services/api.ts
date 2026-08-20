import type { CourseModule, Proposal } from '../types/proposal';
import { getAuthToken } from '../hooks/useAuth';

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

initApiBase();

function authHeader(): Record<string, string> {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: form,
    headers: { ...authHeader() },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
  }
  return res.json();
}

// ---- Auth ----------------------------------------------------------------

export function signIn(email: string) {
  return apiFetch<{ token: string; email: string }>('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function signOut() {
  return apiFetch<{ ok: boolean }>('/auth/signout', { method: 'POST' });
}

export function whoAmI() {
  return apiFetch<{ email: string }>('/auth/me');
}

export interface MyProposalSummary {
  id: string;
  course_name: string;
  updated_at: number;
}

export function listMyProposals() {
  return apiFetch<{ proposals: MyProposalSummary[] }>('/auth/proposals');
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

export interface ModuleReview {
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  bloom_diagnosis: string;
  interactive_ideas: string[];
}

export function reviewModule(payload: {
  module: CourseModule;
  course_essential_question: string;
  course_context: Record<string, string>;
}) {
  return apiFetch<ModuleReview>('/coach/module', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface MaterialReview {
  summary: string;
  strengths: string[];
  improvements: string[];
  bloom_diagnosis: string;
  engagement_ideas: string[];
  extracted_chars: number;
}

export function reviewMaterial(payload: {
  file: File;
  module: CourseModule;
  course_essential_question: string;
  course_context: Record<string, string>;
}) {
  const fd = new FormData();
  fd.append('file', payload.file);
  fd.append('module', JSON.stringify(payload.module));
  fd.append('course_essential_question', payload.course_essential_question || '');
  fd.append('course_context', JSON.stringify(payload.course_context || {}));
  return apiUpload<MaterialReview>('/coach/material', fd);
}

// ---- Save & resume --------------------------------------------------------

export function saveProposal(proposal: Proposal, id?: string) {
  return apiFetch<{ id: string }>('/proposal/save', {
    method: 'POST',
    body: JSON.stringify({ id, data: proposal }),
  });
}

export function loadProposal(id: string) {
  return apiFetch<Proposal>(`/proposal/load/${encodeURIComponent(id)}`);
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

// ---- Pricing intelligence -------------------------------------------------

export interface PricingComparable {
  program: string;
  institution: string;
  format: string;
  duration: string;
  price_range: string;
  why_comparable: string;
}

export interface PricingScenario {
  label: string;
  price: string;
  tradeoff: string;
}

export interface PricingResponse {
  suggested_range_low: string;
  suggested_range_high: string;
  positioning_note: string;
  comparables: PricingComparable[];
  scenarios: PricingScenario[];
  caveats: string;
}

export function analyzePricing(payload: {
  course_name: string;
  course_description: string;
  course_type: string;
  course_format: string;
  intended_audiences: string;
  duration: string;
  contact_hours: string;
  cohort_size: string;
  current_tuition: string;
}) {
  return apiFetch<PricingResponse>('/pricing/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ---- Import from Course Conceptualization Tool ---------------------------

export interface ImportResponse {
  imported: Partial<Proposal>;
  fields_extracted: string[];
  extracted_chars: number;
}

export function importConceptualization(payload: { file?: File; text?: string }) {
  const fd = new FormData();
  if (payload.file) fd.append('file', payload.file);
  fd.append('text', payload.text || '');
  return apiUpload<ImportResponse>('/proposal/import', fd);
}

// ---- Export ---------------------------------------------------------------

export function exportProposal(proposal: Proposal) {
  return apiFetch<{ markdown: string }>('/proposal/export', {
    method: 'POST',
    body: JSON.stringify({ data: proposal }),
  });
}
