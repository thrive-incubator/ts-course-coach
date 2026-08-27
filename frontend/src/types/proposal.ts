export const BLOOM_LEVELS = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
] as const;
export type BloomLevel = typeof BLOOM_LEVELS[number];

export const INTERACTIVE_FEATURES = [
  'Simulation',
  'Case study',
  'Generative AI chat',
  'Role play',
  'Peer review',
  'Live discussion',
  'Reflection journal',
  'Real-world artifact',
  'Guest expert',
  'Field observation',
  'Polling / live check-ins',
] as const;
export type InteractiveFeature = typeof INTERACTIVE_FEATURES[number];

export interface ModuleObjective {
  text: string;
  bloom: BloomLevel | '';
}

export interface ModuleMaterial {
  id: string;
  filename: string;
  uploaded_at: string;
  feedback: string;
  status: 'reviewing' | 'ready' | 'failed';
  error?: string;
}

export interface CourseModule {
  id: string;
  module_name: string;
  contact_hours: string;
  faculty: string;
  format: string;
  essential_question: string;
  objectives: ModuleObjective[];
  critical_information: string;
  engagement_opportunities: string;
  interactive_features: string[];
  interactive_features_notes: string;
  required_readings: string;
  recommended_readings: string;
  assignments: string;
  materials: ModuleMaterial[];
}

/** Legacy row shape from the earlier flat-table curriculum. Kept for hydration. */
export interface CurriculumRow {
  module_name: string;
  contact_hours: string;
  faculty: string;
  format: string;
  topics: string;
  required_readings: string;
  recommended_readings: string;
  assignments: string;
}

export interface Proposal {
  primary_contact: {
    name: string;
    email: string;
  };
  course_overview: {
    course_name: string;
    course_description: string;
    course_type: string;
    course_type_other: string;
    course_format: string;
    course_format_other: string;
    faculty: string;
    intended_audiences: string;
    cohort_size: string;
    duration: string;
    contact_hours: string;
    contact_hours_live: string;
    contact_hours_virtual_sync: string;
    contact_hours_async: string;
    tuition: string;
  };
  rationale: {
    needs_statement: string;
    evidence_of_demand: string;
    competitive_landscape: string;
    additional_notes: string;
  };
  enrollment: {
    recruitment: string;
    marketing: string;
    admissions_criteria: string;
    admissions_skip: boolean;
  };
  marketing_extras: {
    messaging_talking_points: string;
    outreach_places: string;
    one_pager_notes: string;
    outreach_checklist_notes: string;
    outreach_checklist_done: Record<string, boolean>;
  };
  pricing_deep: {
    fair_market_notes: string;
    budget_notes: string;
    ability_to_pay_notes: string;
    affordability_gap_plan: string;
  };
  design: {
    essential_question: string;
    learning_objectives: string;
    course_structure: string;
    modules: CourseModule[];
    technology_needs: string;
    assessment_methods: string;
    student_support: string;
    evaluation_outcomes: string;
    cqi: string;
  };
  financials: {
    financial_overview: string;
  };
  social_plan: {
    campaign_weeks: string;
    start_date: string;
    application_deadline: string;
    landing_url: string;
    contact_email: string;
    channels: string;
    hashtags: string;
    awareness_hook: string;
    outcomes_promise: string;
    audience_segments: string;
    differentiators: string;
    proof_points: string;
    urgency_reason: string;
    tone_notes: string;
  };
}

export const EMPTY_PROPOSAL: Proposal = {
  primary_contact: { name: '', email: '' },
  course_overview: {
    course_name: '',
    course_description: '',
    course_type: '',
    course_type_other: '',
    course_format: '',
    course_format_other: '',
    faculty: '',
    intended_audiences: '',
    cohort_size: '',
    duration: '',
    contact_hours: '',
    contact_hours_live: '',
    contact_hours_virtual_sync: '',
    contact_hours_async: '',
    tuition: '',
  },
  rationale: {
    needs_statement: '',
    evidence_of_demand: '',
    competitive_landscape: '',
    additional_notes: '',
  },
  enrollment: {
    recruitment: '',
    marketing: '',
    admissions_criteria: '',
    admissions_skip: false,
  },
  marketing_extras: {
    messaging_talking_points: '',
    outreach_places: '',
    one_pager_notes: '',
    outreach_checklist_notes: '',
    outreach_checklist_done: {},
  },
  pricing_deep: {
    fair_market_notes: '',
    budget_notes: '',
    ability_to_pay_notes: '',
    affordability_gap_plan: '',
  },
  design: {
    essential_question: '',
    learning_objectives: '',
    course_structure: '',
    modules: [],
    technology_needs: '',
    assessment_methods: '',
    student_support: '',
    evaluation_outcomes: '',
    cqi: '',
  },
  financials: { financial_overview: '' },
  social_plan: {
    campaign_weeks: '12',
    start_date: '',
    application_deadline: '',
    landing_url: '',
    contact_email: '',
    channels: 'LinkedIn, Instagram, X/Twitter, Facebook',
    hashtags: '',
    awareness_hook: '',
    outcomes_promise: '',
    audience_segments: '',
    differentiators: '',
    proof_points: '',
    urgency_reason: '',
    tone_notes: '',
  },
};

export function newModuleId(): string {
  return 'mod_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function newMaterialId(): string {
  return 'mat_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function emptyModule(): CourseModule {
  return {
    id: newModuleId(),
    module_name: '',
    contact_hours: '',
    faculty: '',
    format: '',
    essential_question: '',
    objectives: [],
    critical_information: '',
    engagement_opportunities: '',
    interactive_features: [],
    interactive_features_notes: '',
    required_readings: '',
    recommended_readings: '',
    assignments: '',
    materials: [],
  };
}

export function migrateLegacyRow(row: Partial<CurriculumRow>): CourseModule {
  const m = emptyModule();
  m.module_name = row.module_name || '';
  m.contact_hours = row.contact_hours || '';
  m.faculty = row.faculty || '';
  m.format = row.format || '';
  m.critical_information = row.topics || '';
  m.required_readings = row.required_readings || '';
  m.recommended_readings = row.recommended_readings || '';
  m.assignments = row.assignments || '';
  return m;
}

export const STEP_TITLES = [
  'Contact',
  'Course Overview',
  'Rationale & Landscape',
  'Enrollment & Marketing',
  'Course Design',
  'Financials',
  'Review & Marketing Brief',
] as const;
