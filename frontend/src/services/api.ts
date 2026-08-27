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

const REQUEST_TIMEOUT_MS = 90_000;

/** Run fetch with an AbortController timeout; rethrows aborts as Error('timeout'). */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw new Error('timeout');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build the error thrown for a non-OK response. Always `${status} ${message}` —
 * callers such as useAuth/useProposal rely on the numeric prefix (startsWith('401')
 * / startsWith('404')); display code should pass it through humanError().
 */
async function responseError(res: Response): Promise<Error> {
  const body = await res.text().catch(() => '');
  let detail = '';
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as { detail?: unknown }).detail === 'string'
    ) {
      detail = (parsed as { detail: string }).detail;
    }
  } catch {
    // not JSON
  }
  const message = detail || res.statusText || (body ? body.slice(0, 200) : 'Request failed');
  return new Error(`${res.status} ${message}`);
}

/** Turn an API error into a user-facing string (strips the numeric status prefix). */
export function humanError(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  if (!raw) return fallback;
  if (raw === 'timeout') return 'The coach took too long to answer. Please try again.';
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "Can't reach the server — check your connection.";
  }
  const stripped = raw.replace(/^\d{3} /, '').trim();
  return stripped || fallback;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw await responseError(res);
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    method: 'POST',
    body: form,
    headers: { ...authHeader() },
  });
  if (!res.ok) throw await responseError(res);
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
  tone: 'encouraging' | 'challenging' | 'celebratory';
}

export function getCoachSuggestion(payload: {
  section: string;
  field: string;
  current_value: string;
  course_context: Record<string, string>;
  prior_response?: string;
  follow_up?: string;
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

export interface SiblingModule {
  index: number;
  module_name: string;
  contact_hours: string;
  is_current: boolean;
}

export function reviewModule(payload: {
  module: CourseModule;
  course_essential_question: string;
  course_context: Record<string, string>;
  course_learning_objectives: string;
  sibling_modules: SiblingModule[];
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

/** Fire-and-forget save that survives navigation/tab close (fetch keepalive). */
export function saveProposalKeepalive(proposal: Proposal, id: string) {
  try {
    void fetch(`${API_BASE}/proposal/save`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ id, data: proposal }),
    });
  } catch {
    // best effort
  }
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

// ---- Marketing package (AI-drafted from faculty content) -----------------

export interface OnePagerDraft {
  headline: string;
  subhead: string;
  elevator_pitch: string;
  who_its_for: string[];
  what_youll_leave_with: string[];
  format_and_dates: string;
  tuition_line: string;
  faculty_line: string;
  why_now: string;
  cta: string;
}

export interface ChannelDraft {
  channel: string;
  body: string;
  length_note: string;
}

export interface InfoSessionOutline {
  title: string;
  duration_minutes: number;
  agenda: string[];
  talking_points: string[];
  audience_questions: string[];
}

export interface AnnouncementEmail {
  subject: string;
  preview: string;
  body: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface MarketingPackage {
  one_pager: OnePagerDraft;
  channel_drafts: ChannelDraft[];
  info_session: InfoSessionOutline;
  announcement_email: AnnouncementEmail;
  georgetown_snippet: string;
  faq: FaqEntry[];
}

export function generateMarketingPackage(proposal: Proposal) {
  return apiFetch<MarketingPackage>('/proposal/marketing-package', {
    method: 'POST',
    body: JSON.stringify({ data: proposal }),
  });
}

// ---- Social media marketing plan -----------------------------------------

export interface SocialPost {
  channel: string;
  body: string;
}

export interface CanvaSpec {
  headline: string;
  subhead: string;
  details: string;
  cta: string;
  design_note: string;
}

export interface SocialWeek {
  week_number: number;
  phase: string;
  theme: string;
  hook: string;
  posts: SocialPost[];
  canva: CanvaSpec;
}

export interface SocialPlan {
  campaign_title: string;
  campaign_summary: string;
  weeks: SocialWeek[];
  usage_notes: string[];
}

export function generateSocialPlan(proposal: Proposal) {
  return apiFetch<SocialPlan>('/proposal/social-plan', {
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
  inferred_fields: string[];
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
