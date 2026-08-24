import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CoachButton from '../components/CoachButton';
import PricingCoach from '../components/PricingCoach';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { Field, Select, TextInput, Textarea } from '../components/Field';
import { useProposal } from '../hooks/useProposal';

const COURSE_TYPES = [
  'Year-Long Certificate',
  'Semester-Long Certificate',
  'Mini-Course',
  'Microlearning',
  'Other',
];
const COURSE_FORMATS = ['In-Person', 'Virtual Sync', 'Async', 'Other'];

export default function Marketing() {
  const {
    proposal,
    updateSection,
    remoteId,
    remoteStatus,
    publishRemote,
    loadingRemote,
    remoteError,
    retryLoad,
    startNew,
  } = useProposal();
  const navigate = useNavigate();

  const courseContext = useMemo(
    () => ({
      course_name: proposal.course_overview.course_name,
      course_type: proposal.course_overview.course_type,
      course_format: proposal.course_overview.course_format,
      intended_audiences: proposal.course_overview.intended_audiences,
      duration: proposal.course_overview.duration,
      course_description: proposal.course_overview.course_description,
      contact_hours: proposal.course_overview.contact_hours,
      cohort_size: proposal.course_overview.cohort_size,
      tuition: proposal.course_overview.tuition,
      essential_question: proposal.design.essential_question,
      learning_objectives: proposal.design.learning_objectives,
    }),
    [proposal.course_overview, proposal.design.essential_question, proposal.design.learning_objectives]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceHeader
        title="Marketing & pricing workspace"
        subtitle="Marketing"
        accent="marketing"
        switchTo="pedagogy"
        remoteId={remoteId}
        remoteStatus={remoteStatus}
        onPublish={publishRemote}
        onNew={startNew}
      />

      {loadingRemote && (
        <div className="bg-emerald-50 py-2 text-center text-xs text-emerald-800">
          Loading your saved work…
        </div>
      )}
      {remoteError && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          <span>{remoteError}</span>
          {remoteStatus === 'error' && (
            <button
              type="button"
              onClick={retryLoad}
              className="rounded border border-amber-700 px-2 py-0.5 font-medium hover:bg-amber-100"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Course basics — compact reminder + editable */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Course basics
          </div>
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            {proposal.course_overview.course_name || 'Untitled course'}
          </h2>
          <Field label="Course name">
            <TextInput
              value={proposal.course_overview.course_name}
              onChange={(v) => updateSection('course_overview', { course_name: v })}
              placeholder="Working title"
            />
          </Field>
          <Field label="Intended audience">
            <Textarea
              value={proposal.course_overview.intended_audiences}
              onChange={(v) => updateSection('course_overview', { intended_audiences: v })}
              placeholder="Be specific — roles, career stage, sector."
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Cohort size">
              <TextInput
                value={proposal.course_overview.cohort_size}
                onChange={(v) => updateSection('course_overview', { cohort_size: v })}
                placeholder="e.g. 20-25"
              />
            </Field>
            <Field label="Duration">
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
        </section>

        {/* Rationale */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Section 1
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-900">Rationale &amp; landscape</h2>
          <p className="mb-6 text-sm text-slate-500">
            Why does this course need to exist right now — and how is it different from what learners
            could buy elsewhere?
          </p>

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

          <Field
            label="Additional notes"
            hint="Anything else from your conceptualization work that doesn't fit the fields above."
          >
            <Textarea
              value={proposal.rationale.additional_notes}
              onChange={(v) => updateSection('rationale', { additional_notes: v })}
              rows={4}
            />
          </Field>
        </section>

        {/* Recruitment & enrollment */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Section 2
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-900">Recruitment &amp; enrollment</h2>
          <p className="mb-6 text-sm text-slate-500">
            Where do you find the right people, and how do you select them?
          </p>

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
        </section>

        {/* Pricing & financials */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Section 3
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-900">Pricing &amp; financials</h2>
          <p className="mb-6 text-sm text-slate-500">
            What does it cost to run, and what should it cost to enroll?
          </p>

          <PricingCoach
            courseName={proposal.course_overview.course_name}
            courseDescription={proposal.course_overview.course_description}
            courseType={proposal.course_overview.course_type}
            courseFormat={proposal.course_overview.course_format}
            intendedAudiences={proposal.course_overview.intended_audiences}
            duration={proposal.course_overview.duration}
            contactHours={proposal.course_overview.contact_hours}
            cohortSize={proposal.course_overview.cohort_size}
            currentTuition={proposal.course_overview.tuition}
            onApplyPrice={(p) => updateSection('course_overview', { tuition: p })}
          />

          <Field label="Tuition" hint="The price a learner pays to enroll.">
            <TextInput
              value={proposal.course_overview.tuition}
              onChange={(v) => updateSection('course_overview', { tuition: v })}
              placeholder="e.g. $2,500"
            />
          </Field>

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
        </section>

        {/* CTA row */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-emerald-900">
            Ready to turn this into a launch-ready brief?
          </h3>
          <p className="mb-4 text-sm text-slate-700">
            The Coach turns your rationale + enrollment plan into audience personas, positioning,
            headlines, channels, and social copy — everything the enrollment team needs to start
            marketing.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/brief')}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Generate marketing brief →
            </button>
            <button
              type="button"
              onClick={() => navigate('/pedagogy')}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Jump to course design →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
