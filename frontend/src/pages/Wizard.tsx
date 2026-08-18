import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CoachButton from '../components/CoachButton';
import ModuleCard from '../components/ModuleCard';
import SaveResume from '../components/SaveResume';
import { Field, Select, TextInput, Textarea } from '../components/Field';
import { useProposal } from '../hooks/useProposal';
import { emptyModule, STEP_TITLES } from '../types/proposal';

const COURSE_TYPES = [
  'Year-Long Certificate',
  'Semester-Long Certificate',
  'Mini-Course',
  'Microlearning',
  'Other',
];

const COURSE_FORMATS = ['In-Person', 'Virtual Sync', 'Async', 'Other'];

export default function Wizard() {
  const {
    proposal,
    updateSection,
    updateModule,
    addModule,
    removeModule,
    setProposal,
    remoteId,
    remoteStatus,
    publishRemote,
    loadingRemote,
  } = useProposal();
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const courseContext = useMemo(
    () => ({
      course_name: proposal.course_overview.course_name,
      course_type: proposal.course_overview.course_type,
      course_format: proposal.course_overview.course_format,
      intended_audiences: proposal.course_overview.intended_audiences,
      duration: proposal.course_overview.duration,
      essential_question: proposal.design.essential_question,
    }),
    [proposal.course_overview, proposal.design.essential_question]
  );

  function next() {
    if (step < STEP_TITLES.length - 1) setStep(step + 1);
    else navigate('/brief');
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  function moveModule(from: number, to: number) {
    if (to < 0 || to >= proposal.design.modules.length) return;
    const modules = proposal.design.modules.slice();
    const [m] = modules.splice(from, 1);
    modules.splice(to, 0, m);
    setProposal((prev) => ({ ...prev, design: { ...prev.design, modules } }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Thrive Academy
            </div>
            <h1 className="text-xl font-bold text-slate-900">Course Proposal Coach</h1>
          </div>
          <div className="flex items-center gap-2">
            <SaveResume
              remoteId={remoteId}
              remoteStatus={remoteStatus}
              onPublish={publishRemote}
            />
            <button
              type="button"
              onClick={() => navigate('/preview')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Preview proposal
            </button>
          </div>
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

      {loadingRemote && (
        <div className="bg-emerald-50 py-2 text-center text-xs text-emerald-800">
          Loading your saved proposal…
        </div>
      )}

      <main
        className={
          step === 4
            ? 'mx-auto max-w-5xl px-6 py-8'
            : 'mx-auto max-w-3xl px-6 py-8'
        }
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="mb-1 text-2xl font-bold text-slate-900">{STEP_TITLES[step]}</h2>
          <p className="mb-8 text-sm text-slate-500">{STEP_HELPER[step]}</p>

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
              <div className="mb-8 rounded-xl border border-violet-200 bg-violet-50/40 p-5">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                  Start here — the guiding thread
                </div>
                <Field
                  label="Course essential question"
                  hint="The one big question the whole course helps learners grapple with. Every module ladders back to it."
                  coach={
                    <CoachButton
                      section="design"
                      field="essential_question"
                      fieldLabel="Essential question"
                      currentValue={proposal.design.essential_question}
                      courseContext={courseContext}
                      onApplyExample={(v) =>
                        updateSection('design', { essential_question: v })
                      }
                    />
                  }
                >
                  <Textarea
                    value={proposal.design.essential_question}
                    onChange={(v) => updateSection('design', { essential_question: v })}
                    placeholder="e.g. How do we build reflective supervision practices that actually change how clinicians show up with families?"
                    rows={3}
                  />
                </Field>
              </div>

              <Field
                label="Course-level learning objectives"
                hint="What every learner can do differently by the end. Aligned to Bloom's — observable verbs, one per line."
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
                  rows={5}
                />
              </Field>

              <Field
                label="Course structure / arc"
                hint="How the course arcs across modules — foundational → applied → synthesized."
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
                  rows={3}
                />
              </Field>

              <div className="mb-3 mt-8 flex items-end justify-between border-b border-slate-200 pb-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                    Modules
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Build the course, module by module
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Each module gets its own essential question, objectives tied to it, critical
                    content, engagement moves, interactive features, and a spot to upload slides or
                    lesson plans for coach feedback.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addModule(emptyModule())}
                  className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                >
                  + Add module
                </button>
              </div>

              {proposal.design.modules.length === 0 && (
                <div className="mb-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="text-sm text-slate-600">
                    No modules yet. Add your first module to start designing.
                  </div>
                  <button
                    type="button"
                    onClick={() => addModule(emptyModule())}
                    className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                  >
                    + Add first module
                  </button>
                </div>
              )}

              {proposal.design.modules.map((m, i) => (
                <ModuleCard
                  key={m.id}
                  index={i}
                  module={m}
                  courseEssentialQuestion={proposal.design.essential_question}
                  courseContext={courseContext}
                  onChange={(patch) => updateModule(m.id, patch)}
                  onRemove={() => removeModule(m.id)}
                  onMoveUp={i > 0 ? () => moveModule(i, i - 1) : undefined}
                  onMoveDown={
                    i < proposal.design.modules.length - 1
                      ? () => moveModule(i, i + 1)
                      : undefined
                  }
                />
              ))}

              {proposal.design.modules.length > 0 && (
                <button
                  type="button"
                  onClick={() => addModule(emptyModule())}
                  className="mb-8 w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700"
                >
                  + Add another module
                </button>
              )}

              <div className="mt-8 space-y-6 border-t border-slate-200 pt-6">
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
                      onApplyExample={(v) =>
                        updateSection('design', {
                          student_support: proposal.design.student_support
                            ? proposal.design.student_support + '\n\n' + v
                            : v,
                        })
                      }
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
                      onApplyExample={(v) =>
                        updateSection('design', {
                          cqi: proposal.design.cqi ? proposal.design.cqi + '\n\n' + v : v,
                        })
                      }
                    />
                  }
                >
                  <Textarea
                    value={proposal.design.cqi}
                    onChange={(v) => updateSection('design', { cqi: v })}
                    rows={3}
                  />
                </Field>
              </div>
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
  'Start with the guiding question. Then design module-by-module — each with its own essential question, learning objectives, engagement moves, and interactive features. Upload slides or lesson plans for coach feedback.',
  'The economics that make this course sustainable at the cohort size you have in mind.',
  'Turn your proposal into a launch-ready marketing brief.',
] as const;
