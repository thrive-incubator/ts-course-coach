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
    tuition: string;
  };
  rationale: {
    needs_statement: string;
    evidence_of_demand: string;
    competitive_landscape: string;
  };
  enrollment: {
    recruitment_and_marketing: string;
    admissions_criteria: string;
  };
  design: {
    learning_objectives: string;
    course_structure: string;
    curriculum_outline: CurriculumRow[];
    technology_needs: string;
    assessment_methods: string;
    student_support: string;
    evaluation_outcomes: string;
    cqi: string;
  };
  financials: {
    financial_overview: string;
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
    tuition: '',
  },
  rationale: {
    needs_statement: '',
    evidence_of_demand: '',
    competitive_landscape: '',
  },
  enrollment: {
    recruitment_and_marketing: '',
    admissions_criteria: '',
  },
  design: {
    learning_objectives: '',
    course_structure: '',
    curriculum_outline: [],
    technology_needs: '',
    assessment_methods: '',
    student_support: '',
    evaluation_outcomes: '',
    cqi: '',
  },
  financials: { financial_overview: '' },
};

export const EMPTY_ROW: CurriculumRow = {
  module_name: '',
  contact_hours: '',
  faculty: '',
  format: '',
  topics: '',
  required_readings: '',
  recommended_readings: '',
  assignments: '',
};

export const STEP_TITLES = [
  'Contact',
  'Course Overview',
  'Rationale & Landscape',
  'Enrollment & Marketing',
  'Course Design',
  'Financials',
  'Review & Marketing Brief',
] as const;
