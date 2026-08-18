import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CoachButton from '../components/CoachButton';
import { Field, Select, TextInput, Textarea } from '../components/Field';
import { useProposal } from '../hooks/useProposal';
import { EMPTY_ROW, STEP_TITLES } from '../types/proposal';

const COURSE_TYPES = [
  'Year-Long Certificate',
  'Semester-Long Certificate',
  'Mini-Course',
  'Microlearning',
  'Other',
];

const COURSE_FORMATS = ['In-Person', 'Virtual Sync', 'Async', 'Other'];

export default function Wizard() {
  const { proposal, updateSection } = useProposal();
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const courseContext = useMemo(
    () => ({
      course_name: proposal.course_overview.course_name,
      course_type: proposal.course_overview.course_type,
      course_format: proposal.course_overview.course_format,
      intended_audiences: proposal.course_overview.intended_audiences,
      duration: proposal.course_overview.duration,
    }),
    [proposal.course_overview]
  );

  function next() {
    if (step < STEP_TITLES.length - 1) setStep(step + 1);
    else navigate('/brief');
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Thrive Academy
            </div>
            <h1 className="text-xl font-bold text-slate-900">Course Proposal Coach</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/preview')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Preview proposal
          </button>
        </div>

        <nav className="mx-auto max-w-6xl overflow-x-auto px-6 pb-3">
          <ol className="flex items-center gap-2 text-xs">
            {STEP_TITLES.map((t, i) => (
              <li key={t} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className={
                    'flex items-center gap-2 rounded-full px-3 py-1.5 whitespace-nowrap ' +
                    (i === step
                      ? 'bg-violet-600 text-white'
                      : i < step
                      ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                  }
                >
                  <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-bold">
                    {i + 1}
                  </span>
                  {t}
                </button>
                {i < STEP_TITLES.length - 1 && <span className="text-slate-300">›</span>}
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="mb-1 text-2xl font-bold text-slate-900">{STEP_TITLES[step]}</h2>
          <p className="mb-8 text-sm text-slate-500">
            {STEP_HELPER[step]}
          </p>

          {step === 0 && (
            <>
              <Field label="Primary contact name">
                <TextInput
                  value={proposal.primary_contact.name}
                  onChange={(v) => updateSection('primary_contact', { name: v })}
                  placeholder="e.g. Anna Jesseman"
                />
              </Field>
              <Field label="Primary contact email">
                <TextInput
                  type="email"
                  value={proposal.primary_contact.email}
                  onChange={(v) => updateSection('primary_contact', { email: v })}
                  placeholder="you@georgetown.edu"
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Course name">
                <TextInput
                  value={proposal.course_overview.course_name}
                  onChange={(v) => updateSection('course_overview', { course_name: v })}
                  placeholder="Working title — you can refine later"
                />
              </Field>
              <Field
                label="Course description"
                hint="2-4 sentences a prospective enrollee could scan in 15 seconds."
                coach={
                  <CoachButton
                    section="course_overview"
                    field="course_description"
                    fieldLabel="Course description"
                    currentValue={proposal.course_overview.course_description}
                    courseContext={courseContext}
                    onApplyExample={(v) =>
                      updateSection('course_overview', {
                        course_description: proposal.course_overview.course_description
                          ? proposal.course_overview.course_description + '\n\n' + v
                          : v,
                      })
                    }
                  />
                }
              >
                <Textarea
                  value={proposal.course_overview.course_description}
                  onChange={(v) => updateSection('course_overview', { course_description: v })}
                  placeholder="Who it's for, what they'll learn, why it matters."
                  rows={5}
                />
              </Field>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field label="Course type">
                  <Select
                    value={proposal.course_overview.course_type}
                    onChange={(v) => updateSection('course_overview', { course_type: v })}
                    options={COURSE_TYPES}
                  />
                </Field>
                <Field label="Course format">
                  <Select
                    value={proposal.course_overview.course_format}
                    onChange={(v) => updateSection('course_overview', { course_format: v })}
                    options={COURSE_FORMATS}
                  />
                </Field>
              </div>
              <Field label="Faculty">
                <TextInput
                  value={proposal.course_overview.faculty}
                  onChange={(v) => updateSection('course_overview', { faculty: v })}
                  placeholder="Lead + any co-instructors"
                />
              </Field>
              <Field
                label="Intended audiences"
                hint="Who is this actually for? Be specific — roles, career stage, sector."
              >
                <Textarea
                  value={proposal.course_overview.intended_audiences}
                  onChange={(v) => updateSection('course_overview', { intended_audiences: v })}
                  placeholder="e.g. Mid-career IECMH consultants working in state early-intervention systems"
                  rows={3}
                />
              </Field>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <Field label="Cohort size">
                  <TextInput
                    value={proposal.course_overview.cohort_size}
                    onChange={(v) => updateSection('course_overview', { cohort_size: v })}
                    placeholder="e.g. 20-25"
                  />
                </Field>
                <Field label="Course dates / duration">
                  <TextInput
                    value={proposal.course_overview.duration}
                    onChange={(v) => updateSection('course_overview', { duration: v })}
                    placeholder="e.g. Jan-May 2027"
                  />
                </Field>
                <Field label="Contact hours">
                  <TextInput
                    value={proposal.course_overview.contact_hours}
                    onChange={(v) => updateSection('course_overview', { contact_hours: v })}
                    placeholder="Cumulative"
                  />
                </Field>
              </div>
              <Field label="Tuition">
                <TextInput
                  value={proposal.course_overview.tuition}
                  onChange={(v) => updateSection('course_overview', { tuition: v })}
                  placeholder="e.g. $2,500"
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field
                label="Needs statement"
                hint="What practitioner or systemic gap does this course close?"
                coach={
                  <CoachButton
                    section="rationale"
                    field="needs_statement"
                    fieldLabel="Needs statement"
                    currentValue={proposal.rationale.needs_statement}
                    courseContext={courseContext}
                    onApplyExample={(v) =>
                      updateSection('rationale', {
                        needs_statement: proposal.rationale.needs_statement
                          ? proposal.rationale.needs_statement + '\n\n' + v
                          : v,
                      })
                    }
                  />
                }
              >
                <Textarea
                  value={proposal.rationale.needs_statement}
                  onChange={(v) => updateSection('rationale', { needs_statement: v })}
                  rows={5}
                />
              </Field>
              <Field
                label="Evidence of demand"
                hint="Waitlists, surveys, workforce reports, employer requests, CEU shifts…"
                coach={
                  <CoachButton
                    section="rationale"
                    field="evidence_of_demand"
                    fieldLabel="Evidence of demand"
                    currentValue={proposal.rationale.evidence_of_demand}
                    courseContext={courseContext}
                    onApplyExample={(v) =>
                      updateSection('rationale', {
                        evidence_of_demand: proposal.rationale.evidence_of_demand
                          ? proposal.rationale.evidence_of_demand + '\n\n' + v
                          : v,
                      })
                    }
                  />
                }
              >
                <Textarea
                  value={proposal.rationale.evidence_of_demand}
                  onChange={(v) => updateSection('rationale', { evidence_of_demand: v })}
                  rows={5}
                />
              </Field>
              <Field
                label="Competitive landscape"
                hint="Every learner has alternatives — name 2-3 and your distinct wedge."
                coach={
                  <CoachButton
                    section="rationale"
                    field="competitive_landscape"
                    fieldLabel="Competitive landscape"
                    currentValue={proposal.rationale.competitive_landscape}
                    courseContext={courseContext}
                    onApplyExample={(v) =>
                      updateSection('rationale', {
                        competitive_landscape: proposal.rationale.competitive_landscape
                          ? proposal.rationale.competitive_landscape + '\n\n' + v
                          : v,
                      })
                    }
                  />
                }
              >
                <Textarea
                  value={proposal.rationale.competitive_landscape}
                  onChange={(v) => updateSection('rationale', { competitive_landscape: v })}
                  rows={5}
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field
                label="Recruitment and marketing"
                hint="Where does this audience already gather? What one line makes them stop scrolling?"
                coach={
                  <CoachButton
                    section="enrollment"
                    field="recruitment_and_marketing"
                    fieldLabel="Recruitment & marketing"
                    currentValue={proposal.enrollment.recruitment_and_marketing}
                    courseContext={courseContext}
                    onApplyExample={(v) =>
                      updateSection('enrollment', {
                        recruitment_and_marketing: proposal.enrollment.recruitment_and_marketing
                          ? proposal.enrollment.recruitment_and_marketing + '\n\n' + v
                          : v,
                      })
                    }
                  />
                }
              >
                <Textarea
                  value={proposal.enrollment.recruitment_and_marketing}
                  onChange={(v) => updateSection('enrollment', { recruitment_and_marketing: v })}
                  rows={5}
                />
              </Field>
              <Field
                label="Admissions criteria & selection process"
                hint="What makes someone a fit? What's the intake step?"
              >
                <Textarea
                  value={proposal.enrollment.admissions_criteria}
                  onChange={(v) => updateSection('enrollment', { admissions_criteria: v })}
                  rows={4}
                />
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <Field
                label="Learning objectives"
                hint="Aligned to Bloom's Revised Taxonomy — observable verbs, one per line."
                coach={
                  <CoachButton
                    section="design"
                    field="learning_objectives"
                    fieldLabel="Learning objectives"
                    currentValue={proposal.design.learning_objectives}
                    courseContext={courseContext}
                    onApplyExample={(v) =>
                      updateSection('design', {
                        learning_objectives: proposal.design.learning_objectives
                          ? proposal.design.learning_objectives + '\n' + v
                          : v,
                      })
                    }
                  />
                }
              >
                <Textarea
                  value={proposal.design.learning_objectives}
                  onChange={(v) => updateSection('design', { learning_objectives: v })}
                  placeholder="By the end of this course, learners will be able to…"
                  rows={6}
                />
              </Field>
              <Field
                label="Course structure"
                hint="How the arc unfolds — foundational → applied → synthesized."
                coach={
                  <CoachButton
                    section="design"
                    field="course_structure"
                    fieldLabel="Course structure"
                    currentValue={proposal.design.course_structure}
                    courseContext={courseContext}
                    onApplyExample={(v) =>
                      updateSection('design', {
                        course_structure: proposal.design.course_structure
                          ? proposal.design.course_structure + '\n\n' + v
                          : v,
                      })
                    }
                  />
                }
              >
                <Textarea
                  value={proposal.design.course_structure}
                  onChange={(v) => updateSection('design', { course_structure: v })}
                  rows={4}
                />
              </Field>

              <CurriculumTable
                rows={proposal.design.curriculum_outline}
                onChange={(rows) => updateSection('design', { curriculum_outline: rows })}
              />

              <Field label="Technology needs">
                <Textarea
                  value={proposal.design.technology_needs}
                  onChange={(v) => updateSection('design', { technology_needs: v })}
                  placeholder="LMS, Zoom, breakout tools, submission platform, etc."
                  rows={3}
                />
              </Field>
              <Field
                label="Grading scheme & assessment methods"
                coach={
                  <CoachButton
                    section="design"
                    field="assessment_methods"
                    fieldLabel="Assessment methods"
                    currentValue={proposal.design.assessment_methods}
                    courseContext={courseContext}
                    onApplyExample={(v) =>
                      updateSection('design', {
                        assessment_methods: proposal.design.assessment_methods
                          ? proposal.design.assessment_methods + '\n\n' + v
                          : v,
                      })
                    }
                  />
                }
              >
                <Textarea
                  value={proposal.design.assessment_methods}
                  onChange={(v) => updateSection('design', { assessment_methods: v })}
                  rows={4}
                />
              </Field>
              <Field
                label="Student support"
                coach={
                  <CoachButton
                    section="design"
                    field="student_support"
                    fieldLabel="Student support"
                    currentValue={proposal.design.student_support}
                    courseContext={courseContext}
                  />
                }
              >
                <Textarea
                  value={proposal.design.student_support}
                  onChange={(v) => updateSection('design', { student_support: v })}
                  rows={3}
                />
              </Field>
              <Field label="Evaluation & outcomes">
                <Textarea
                  value={proposal.design.evaluation_outcomes}
                  onChange={(v) => updateSection('design', { evaluation_outcomes: v })}
                  rows={3}
                />
              </Field>
              <Field
                label="CQI & staying current"
                coach={
                  <CoachButton
                    section="design"
                    field="cqi"
                    fieldLabel="CQI & staying current"
                    currentValue={proposal.design.cqi}
                    courseContext={courseContext}
                  />
                }
              >
                <Textarea
                  value={proposal.design.cqi}
                  onChange={(v) => updateSection('design', { cqi: v })}
                  rows={3}
                />
              </Field>
            </>
          )}

          {step === 5 && (
            <>
              <Field
                label="Financial overview / business plan"
                hint="Tuition, cohort-size assumptions, cost drivers, sustainability, projections."
                coach={
                  <CoachButton
                    section="financials"
                    field="financial_overview"
                    fieldLabel="Financial overview"
                    currentValue={proposal.financials.financial_overview}
                    courseContext={courseContext}
                    onApplyExample={(v) =>
                      updateSection('financials', {
                        financial_overview: proposal.financials.financial_overview
                          ? proposal.financials.financial_overview + '\n\n' + v
                          : v,
                      })
                    }
                  />
                }
              >
                <Textarea
                  value={proposal.financials.financial_overview}
                  onChange={(v) => updateSection('financials', { financial_overview: v })}
                  rows={8}
                />
              </Field>
            </>
          )}

          {step === 6 && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-6">
              <h3 className="mb-2 text-lg font-semibold text-violet-900">
                Ready for your marketing brief
              </h3>
              <p className="mb-4 text-sm text-slate-700">
                You've walked through all five sections. Click below to have the Coach turn your
                proposal into a launch-ready marketing brief — audience personas, positioning,
                headlines, channels, and social copy. You can also preview the formatted proposal
                to hand to Frances / Anna.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/brief')}
                  className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
                >
                  Generate marketing brief →
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/preview')}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Preview proposal
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              ← Back
            </button>
            <div className="text-xs text-slate-500">
              Step {step + 1} of {STEP_TITLES.length} · Auto-saved
            </div>
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              {step === STEP_TITLES.length - 1 ? 'Finish' : 'Next →'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const STEP_HELPER = [
  'Who should Thrive Academy reach out to about this proposal?',
  'The elevator pitch: what is this course, who is it for, what shape does it take?',
  'Why does this course need to exist right now — and how is it different from what learners could buy elsewhere?',
  'Where do you find the right people, and how do you select them?',
  'What learners can do differently by the end, and how the experience gets them there.',
  'The economics that make this course sustainable at the cohort size you have in mind.',
  'Turn your proposal into a launch-ready marketing brief.',
] as const;

function CurriculumTable({
  rows,
  onChange,
}: {
  rows: typeof EMPTY_ROW[];
  onChange: (rows: typeof EMPTY_ROW[]) => void;
}) {
  return (
    <div className="mb-6">
      <label className="mb-1 block text-sm font-medium text-slate-900">
        Preliminary curriculum outline
      </label>
      <p className="mb-3 text-xs text-slate-500">
        One row per module. You can start with 2-3 and refine.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {['Module', 'Hours', 'Faculty', 'Format', 'Topics', 'Required', 'Recommended', 'Assignments', ''].map(
                (h) => (
                  <th key={h} className="px-2 py-2 text-left font-medium">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r, i) => (
              <tr key={i}>
                {(
                  [
                    'module_name',
                    'contact_hours',
                    'faculty',
                    'format',
                    'topics',
                    'required_readings',
                    'recommended_readings',
                    'assignments',
                  ] as const
                ).map((k) => (
                  <td key={k} className="p-1">
                    <input
                      value={r[k]}
                      onChange={(e) => {
                        const next = rows.slice();
                        next[i] = { ...r, [k]: e.target.value };
                        onChange(next);
                      }}
                      className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-xs focus:border-violet-400 focus:bg-white focus:outline-none"
                    />
                  </td>
                ))}
                <td className="p-1">
                  <button
                    type="button"
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                    className="rounded px-1 text-slate-400 hover:text-rose-600"
                    aria-label="Remove row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-xs text-slate-400">
                  No modules yet. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { ...EMPTY_ROW }])}
        className="mt-2 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
      >
        + Add module
      </button>
    </div>
  );
}
