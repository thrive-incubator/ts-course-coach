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

export interface SyllabusWeek {
  id: string;
  week_label: string;
  date_range: string;
  module_ref: string;
  topic: string;
  readings: string;
  activities: string;
  assignment_due: string;
}

export interface SyllabusAssignment {
  id: string;
  name: string;
  due_date: string;
  weight: string;
  description: string;
}

const GEORGETOWN_POLICIES = {
  academic_integrity: 'All students are expected to maintain the highest standards of academic integrity. Any form of academic dishonesty — including plagiarism, fabrication, cheating, or facilitating academic dishonesty — is a serious violation that may result in course failure and additional disciplinary action. Students are responsible for understanding the Honor System and seeking clarification when unsure whether a specific action constitutes a violation.',
  ada: 'Thrive Academy is committed to providing reasonable accommodations for students with disabilities. If you require accommodations, please contact the course instructor as early as possible so arrangements can be made. Documentation from a qualified professional may be requested.',
  title_ix: 'Thrive Academy prohibits sex and gender-based discrimination, including sexual harassment, sexual assault, dating and domestic violence, and stalking. Faculty are considered responsible employees and must report disclosures of such conduct to the Title IX Coordinator. Confidential resources are available for students who prefer to speak privately.',
  anti_discrimination: 'Thrive Academy does not discriminate on the basis of age, color, disability, family responsibilities, gender identity or expression, genetic information, marital status, national origin, personal appearance, political affiliation, race, religion, sex, sexual orientation, source of income, or veteran status in its programs or activities.',
  student_support: 'Course staff are committed to your success. Office hours are listed above. Beyond the instructor, learners may access cohort peer discussion, scheduled 1:1 check-ins, and asynchronous support channels. If you are struggling — academically, logistically, or personally — reach out early.',
  netiquette: 'In virtual sessions and discussion threads, treat classmates as you would in a shared room: cameras on when able, microphones muted when not speaking, chat used for substantive questions, and disagreement expressed with care. Protect the confidentiality of case material shared by peers.',
};

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
  syllabus: {
    course_number: string;
    instructor_name: string;
    instructor_credentials: string;
    instructor_email: string;
    instructor_phone: string;
    office_hours: string;
    semester: string;
    start_date: string;
    end_date: string;
    meeting_days_times: string;
    format: string;
    location: string;
    credit_hours: string;
    ceus: string;
    grading_mode: string;
    weekly_time_budget: string;
    description_override: string;
    objectives_override: string;
    knowledge_skills: string;
    required_texts: string;
    recommended_texts: string;
    technology_requirements: string;
    weeks: SyllabusWeek[];
    assignments: SyllabusAssignment[];
    grading_breakdown: string;
    late_work_policy: string;
    attendance_policy: string;
    academic_integrity_policy: string;
    ada_statement: string;
    title_ix_statement: string;
    anti_discrimination_statement: string;
    student_support_statement: string;
    netiquette_statement: string;
    additional_policies: string;
  };
  financials: {
    financial_overview: string;
    budget: CourseBudget;
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

// Mirrors the Thrive Academy Course Budget Worksheet. Numbers are kept as strings
// so the inputs behave like the rest of the form; they're parsed at calculation time.
export interface BudgetRevenueLine {
  learners: string;
  rate: string;
  notes: string;
}

export interface BudgetFacultyDirector {
  name: string;
  engagement_period: string;
  allocation: string;
}

export interface CourseBudget {
  employer_sponsored: BudgetRevenueLine;
  self_pay: BudgetRevenueLine;
  scholarship: BudgetRevenueLine;
  additional_revenue: string;
  additional_revenue_notes: string;
  faculty_directors: BudgetFacultyDirector[];
  faculty_sharing_notes: string;
  guest_speakers_count: string;
  guest_speaker_rate: string;
  guest_speaker_notes: string;
  additional_expenses: string;
  additional_expenses_notes: string;
}

export const EMPTY_BUDGET: CourseBudget = {
  employer_sponsored: { learners: '', rate: '', notes: '' },
  self_pay: { learners: '', rate: '', notes: '' },
  scholarship: { learners: '', rate: '', notes: '' },
  additional_revenue: '',
  additional_revenue_notes: '',
  faculty_directors: [{ name: '', engagement_period: '', allocation: '' }],
  faculty_sharing_notes: '',
  guest_speakers_count: '',
  guest_speaker_rate: '',
  guest_speaker_notes: '',
  additional_expenses: '',
  additional_expenses_notes: '',
};

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
  syllabus: {
    course_number: '',
    instructor_name: '',
    instructor_credentials: '',
    instructor_email: '',
    instructor_phone: '',
    office_hours: '',
    semester: '',
    start_date: '',
    end_date: '',
    meeting_days_times: '',
    format: '',
    location: '',
    credit_hours: '',
    ceus: '',
    grading_mode: 'Letter grade',
    weekly_time_budget: '',
    description_override: '',
    objectives_override: '',
    knowledge_skills: '',
    required_texts: '',
    recommended_texts: '',
    technology_requirements: '',
    weeks: [],
    assignments: [],
    grading_breakdown: '',
    late_work_policy: '',
    attendance_policy: '',
    academic_integrity_policy: GEORGETOWN_POLICIES.academic_integrity,
    ada_statement: GEORGETOWN_POLICIES.ada,
    title_ix_statement: GEORGETOWN_POLICIES.title_ix,
    anti_discrimination_statement: GEORGETOWN_POLICIES.anti_discrimination,
    student_support_statement: GEORGETOWN_POLICIES.student_support,
    netiquette_statement: GEORGETOWN_POLICIES.netiquette,
    additional_policies: '',
  },
  financials: { financial_overview: '', budget: EMPTY_BUDGET },
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

export function newWeekId(): string {
  return 'wk_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function newAssignmentId(): string {
  return 'asn_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function emptyWeek(): SyllabusWeek {
  return {
    id: newWeekId(),
    week_label: '',
    date_range: '',
    module_ref: '',
    topic: '',
    readings: '',
    activities: '',
    assignment_due: '',
  };
}

export function emptyAssignment(): SyllabusAssignment {
  return {
    id: newAssignmentId(),
    name: '',
    due_date: '',
    weight: '',
    description: '',
  };
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
