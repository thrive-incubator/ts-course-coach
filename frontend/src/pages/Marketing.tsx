import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CoachButton from '../components/CoachButton';
import PricingCoach from '../components/PricingCoach';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { Field, Select, TextInput, Textarea } from '../components/Field';
import { useProposal } from '../hooks/useProposal';
import { generateSocialPlan, humanError, type SocialPlan } from '../services/api';

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
            <Field label="Total contact hours">
              <TextInput
                value={proposal.course_overview.contact_hours}
                onChange={(v) => updateSection('course_overview', { contact_hours: v })}
                placeholder="Cumulative"
              />
            </Field>
          </div>

          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-sm font-semibold text-slate-800">Contact hours by mode</div>
              <div className="text-xs text-slate-500">
                Break the total above into how learners actually spend it.
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Live (in-person)">
                <TextInput
                  value={proposal.course_overview.contact_hours_live}
                  onChange={(v) => updateSection('course_overview', { contact_hours_live: v })}
                  placeholder="e.g. 12"
                />
              </Field>
              <Field label="Virtual synchronous">
                <TextInput
                  value={proposal.course_overview.contact_hours_virtual_sync}
                  onChange={(v) =>
                    updateSection('course_overview', { contact_hours_virtual_sync: v })
                  }
                  placeholder="e.g. 18"
                />
              </Field>
              <Field label="Asynchronous">
                <TextInput
                  value={proposal.course_overview.contact_hours_async}
                  onChange={(v) => updateSection('course_overview', { contact_hours_async: v })}
                  placeholder="e.g. 20"
                />
              </Field>
            </div>
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
            hint="What practitioner or systemic gap does this course close? Write in your own words — no Coach here on purpose."
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
            label="Recruitment"
            hint="Where does this audience already gather? Which listservs, associations, LinkedIn groups, conferences, and partner orgs get you in front of them?"
            coach={
              <CoachButton
                section="enrollment"
                field="recruitment"
                fieldLabel="Recruitment"
                currentValue={proposal.enrollment.recruitment}
                courseContext={courseContext}
                onApplyExample={(v) =>
                  updateSection('enrollment', {
                    recruitment: proposal.enrollment.recruitment
                      ? proposal.enrollment.recruitment + '\n\n' + v
                      : v,
                  })
                }
              />
            }
          >
            <Textarea
              value={proposal.enrollment.recruitment}
              onChange={(v) => updateSection('enrollment', { recruitment: v })}
              rows={5}
            />
          </Field>

          <Field
            label="Marketing"
            hint="What one line makes them stop scrolling? What proof points unlock trust? Which channels carry the message?"
            coach={
              <CoachButton
                section="enrollment"
                field="marketing"
                fieldLabel="Marketing"
                currentValue={proposal.enrollment.marketing}
                courseContext={courseContext}
                onApplyExample={(v) =>
                  updateSection('enrollment', {
                    marketing: proposal.enrollment.marketing
                      ? proposal.enrollment.marketing + '\n\n' + v
                      : v,
                  })
                }
              />
            }
          >
            <Textarea
              value={proposal.enrollment.marketing}
              onChange={(v) => updateSection('enrollment', { marketing: v })}
              rows={5}
            />
          </Field>

          <Field
            label="Admissions criteria & selection process"
            hint="What makes someone a fit? What's the intake step?"
          >
            <div className="mb-2 flex items-center gap-2 text-xs">
              <input
                id="admissions-skip"
                type="checkbox"
                checked={proposal.enrollment.admissions_skip}
                onChange={(e) =>
                  updateSection('enrollment', { admissions_skip: e.target.checked })
                }
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600"
              />
              <label htmlFor="admissions-skip" className="text-slate-600">
                Skip here — no separate admissions criteria for this course
              </label>
            </div>
            {proposal.enrollment.admissions_skip ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs italic text-slate-500">
                Skipped. Open enrollment — anyone who registers can attend.
              </div>
            ) : (
              <Textarea
                value={proposal.enrollment.admissions_criteria}
                onChange={(v) => updateSection('enrollment', { admissions_criteria: v })}
                rows={4}
              />
            )}
          </Field>
        </section>

        <MessagingSection courseContext={courseContext} />
        <OutreachPipelinesSection courseContext={courseContext} />
        <CopyTemplatesSection />

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

        {/* Social Media Marketing Plan */}
        <SocialMediaPlanSection />
        <OnePagerSection courseContext={courseContext} />
        <OutreachChecklistSection />

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

function SocialMediaPlanSection() {
  const { proposal, updateSection } = useProposal();
  const [plan, setPlan] = useState<SocialPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const social = proposal.social_plan;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const p = await generateSocialPlan(proposal);
      setPlan(p);
    } catch (e) {
      setError(humanError(e, 'Could not build the plan.'));
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!plan) return;
    const md = renderPlanMarkdown(plan, proposal.course_overview.course_name);
    const slug =
      (proposal.course_overview.course_name || 'course')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'course';
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-social-media-plan.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Section 4
      </div>
      <h2 className="mb-1 text-xl font-bold text-slate-900">Social media marketing plan</h2>
      <p className="mb-6 text-sm text-slate-500">
        Answer the prompts, then generate a week-by-week social content calendar you can
        download and hand to the marketing team.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Campaign length (weeks)" hint="Usually 8 to 12.">
          <TextInput
            value={social.campaign_weeks}
            onChange={(v) => updateSection('social_plan', { campaign_weeks: v })}
            placeholder="12"
          />
        </Field>
        <Field label="Campaign start date">
          <TextInput
            value={social.start_date}
            onChange={(v) => updateSection('social_plan', { start_date: v })}
            placeholder="e.g. May 13, 2027"
          />
        </Field>
        <Field label="Application deadline">
          <TextInput
            value={social.application_deadline}
            onChange={(v) => updateSection('social_plan', { application_deadline: v })}
            placeholder="e.g. August 1, 2027"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Landing page URL" hint="Where every post sends readers.">
          <TextInput
            value={social.landing_url}
            onChange={(v) => updateSection('social_plan', { landing_url: v })}
            placeholder="https://…"
          />
        </Field>
        <Field label="Contact email">
          <TextInput
            value={social.contact_email}
            onChange={(v) => updateSection('social_plan', { contact_email: v })}
            placeholder="programs@…"
          />
        </Field>
      </div>

      <Field label="Channels" hint="Comma-separated. One post per channel per week.">
        <TextInput
          value={social.channels}
          onChange={(v) => updateSection('social_plan', { channels: v })}
          placeholder="LinkedIn, Instagram, X/Twitter, Facebook"
        />
      </Field>

      <Field label="Hashtags" hint="Space-separated. Included at the end of longer posts.">
        <TextInput
          value={social.hashtags}
          onChange={(v) => updateSection('social_plan', { hashtags: v })}
          placeholder="#YourField #Certificate #Institution"
        />
      </Field>

      <Field
        label="Awareness hook — the gap this course fills"
        hint="The problem or missed opportunity the audience already feels. Fuels the first third of the calendar."
      >
        <Textarea
          value={social.awareness_hook}
          onChange={(v) => updateSection('social_plan', { awareness_hook: v })}
          rows={4}
        />
      </Field>

      <Field
        label="Outcomes promise — what the learner can do after"
        hint="The future-state picture. What a graduate walks away able to do differently."
      >
        <Textarea
          value={social.outcomes_promise}
          onChange={(v) => updateSection('social_plan', { outcomes_promise: v })}
          rows={4}
        />
      </Field>

      <Field
        label="Audience segments to spotlight"
        hint="If you want different weeks to speak to different roles (e.g. therapists, then admin, then pathway-seekers), list them here."
      >
        <Textarea
          value={social.audience_segments}
          onChange={(v) => updateSection('social_plan', { audience_segments: v })}
          rows={3}
        />
      </Field>

      <Field
        label="Differentiators"
        hint="Faculty names, guest experts, curriculum shape, capstone, endorsements, cohort model."
      >
        <Textarea
          value={social.differentiators}
          onChange={(v) => updateSection('social_plan', { differentiators: v })}
          rows={4}
        />
      </Field>

      <Field
        label="Proof points"
        hint="Accreditation, competency crosswalks, alumni outcomes, institutional home."
      >
        <Textarea
          value={social.proof_points}
          onChange={(v) => updateSection('social_plan', { proof_points: v })}
          rows={3}
        />
      </Field>

      <Field
        label="Urgency reason"
        hint="Why apply now — cohort caps, application deadline, next cohort date."
      >
        <Textarea
          value={social.urgency_reason}
          onChange={(v) => updateSection('social_plan', { urgency_reason: v })}
          rows={3}
        />
      </Field>

      <Field
        label="Tone / rules"
        hint="Optional. E.g. 'no em dashes', 'avoid clinical jargon', 'always name Georgetown Thrive Center'."
      >
        <Textarea
          value={social.tone_notes}
          onChange={(v) => updateSection('social_plan', { tone_notes: v })}
          rows={2}
        />
      </Field>

      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="mb-2 text-sm font-semibold text-emerald-900">
          Generate a downloadable marketing plan
        </div>
        <p className="mb-4 text-xs text-slate-700">
          Uses everything above plus your course overview and rationale. Produces a
          week-by-week calendar with post copy for each channel and Canva design notes.
          Takes about 30 seconds.
        </p>
        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Building plan…' : plan ? 'Rebuild plan' : 'Generate plan ✨'}
          </button>
          {plan && (
            <button
              type="button"
              onClick={download}
              className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
            >
              Download plan (.md) ↓
            </button>
          )}
        </div>

        {plan && (
          <div className="mt-5 space-y-4">
            {plan.campaign_summary && (
              <p className="text-sm italic text-slate-700">{plan.campaign_summary}</p>
            )}
            {plan.weeks.map((w) => (
              <div
                key={w.week_number}
                className="rounded-lg border border-slate-200 bg-white p-4 text-sm"
              >
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-semibold text-slate-900">
                    Week {w.week_number} · {w.theme}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-emerald-700">
                    {w.phase}
                  </div>
                </div>
                <div className="mb-2 text-xs text-slate-600">{w.hook}</div>
                <details className="text-xs text-slate-700">
                  <summary className="cursor-pointer text-emerald-800">
                    Show {w.posts.length} post{w.posts.length === 1 ? '' : 's'} + Canva spec
                  </summary>
                  <div className="mt-2 space-y-2">
                    {w.posts.map((post, idx) => (
                      <div key={idx} className="rounded bg-slate-50 p-2">
                        <div className="mb-1 text-xs font-semibold text-slate-600">
                          {post.channel}
                        </div>
                        <div className="whitespace-pre-wrap text-slate-800">{post.body}</div>
                      </div>
                    ))}
                    <div className="rounded bg-amber-50 p-2">
                      <div className="mb-1 text-xs font-semibold text-amber-800">
                        Canva design
                      </div>
                      <div className="text-slate-800">
                        <div><strong>Headline:</strong> {w.canva.headline}</div>
                        {w.canva.subhead && (
                          <div><strong>Subhead:</strong> {w.canva.subhead}</div>
                        )}
                        {w.canva.details && (
                          <div><strong>Details:</strong> {w.canva.details}</div>
                        )}
                        {w.canva.cta && <div><strong>CTA:</strong> {w.canva.cta}</div>}
                        {w.canva.design_note && (
                          <div className="text-slate-600"><em>{w.canva.design_note}</em></div>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            ))}
            {plan.usage_notes.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <div className="mb-2 font-semibold text-slate-900">Usage notes</div>
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700">
                  {plan.usage_notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function MessagingSection({ courseContext }: { courseContext: Record<string, string> }) {
  const { proposal, updateSection } = useProposal();
  const points = proposal.marketing_extras.messaging_talking_points;
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Messaging
      </div>
      <h2 className="mb-1 text-xl font-bold text-slate-900">
        Your talking points → catchy options
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        Say what you think the message should be, in your own words. Then the Coach turns your
        talking points into catchy options you can pick from — headlines, taglines, one-liners.
      </p>

      <Field
        label="What do you want to say about this course?"
        hint="Not a headline yet — just your talking points. What matters. What learners will get. Why now."
      >
        <Textarea
          value={points}
          onChange={(v) => updateSection('marketing_extras', { messaging_talking_points: v })}
          rows={6}
          placeholder="Bullet or paragraph — whichever's faster."
        />
      </Field>

      <div className="mt-2">
        <CoachButton
          section="messaging"
          field="marketing"
          fieldLabel="Catchy options from your talking points"
          currentValue={points}
          courseContext={courseContext}
          onApplyExample={(v) =>
            updateSection('marketing_extras', {
              messaging_talking_points: points ? points + '\n\n[Catchy]: ' + v : v,
            })
          }
        />
      </div>
    </section>
  );
}

function OutreachPipelinesSection({
  courseContext,
}: {
  courseContext: Record<string, string>;
}) {
  const { proposal, updateSection } = useProposal();
  const places = proposal.marketing_extras.outreach_places;
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Outreach pipelines
      </div>
      <h2 className="mb-1 text-xl font-bold text-slate-900">
        Where can you reach the audience?
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        Dump every place you think will reach your target audience — listservs, associations,
        LinkedIn groups, conferences, partner orgs, faculty networks, anywhere. Then the Coach
        weighs in with a "what about…" — channels you didn't list that fit this audience.
      </p>

      <Field
        label="Your list of outreach places"
        hint="One per line is fine. Be specific — 'ZERO TO THREE listserv' beats 'infant-mental-health listservs'."
      >
        <Textarea
          value={places}
          onChange={(v) => updateSection('marketing_extras', { outreach_places: v })}
          rows={7}
          placeholder="e.g.&#10;ZERO TO THREE listserv&#10;Georgetown Ed School alumni LinkedIn group&#10;State infant-mental-health chapters"
        />
      </Field>

      <div className="mt-2">
        <CoachButton
          section="enrollment"
          field="recruitment"
          fieldLabel="Coach: what about…"
          currentValue={places}
          courseContext={courseContext}
          onApplyExample={(v) =>
            updateSection('marketing_extras', {
              outreach_places: places ? places + '\n' + v : v,
            })
          }
        />
      </div>
    </section>
  );
}

function CopyTemplatesSection() {
  const { proposal } = useProposal();
  const co = proposal.course_overview;
  const talking = proposal.marketing_extras.messaging_talking_points.trim();
  const name = co.course_name || 'this new course';
  const audience = co.intended_audiences || 'the folks who need it most';
  const format = co.course_format || 'a mix of live and self-paced';
  const duration = co.duration || 'a focused cohort window';

  const templates: { channel: string; body: string; note?: string }[] = [
    {
      channel: 'LinkedIn post',
      body:
        `We're launching ${name} — for ${audience}.\n\n` +
        (talking ? talking + '\n\n' : '') +
        `Format: ${format}. Runs: ${duration}.\n\n` +
        `If you (or someone in your network) has been waiting for this, DM me or drop a note below and I'll send details.\n\n` +
        `#ThriveAcademy #ContinuingEd`,
      note:
        'Post from a faculty member\'s personal account first — organic reach on personal posts is 5-10x higher than institutional pages.',
    },
    {
      channel: 'X / Facebook post',
      body:
        `New at Thrive Academy: ${name}.\n\n` +
        `Built for ${audience}. ${format}.\n\n` +
        (talking ? talking.split('\n')[0] + '\n\n' : '') +
        `Details + application: [link]`,
      note: 'Keep under 280 chars on X — trim the talking-points line if you need to.',
    },
    {
      channel: 'Flyer copy',
      body:
        `${name.toUpperCase()}\n\n` +
        `A Thrive Academy course for ${audience}.\n\n` +
        (talking ? talking + '\n\n' : `[Your one-line hook here]\n\n`) +
        `Format: ${format}\n` +
        `Dates: ${duration}\n` +
        `Contact hours: ${co.contact_hours || '[hours]'}\n` +
        (co.tuition ? `Tuition: ${co.tuition}\n\n` : '\n') +
        `Apply: [URL]  ·  Questions: [email]`,
      note: 'Give this to a designer as the copy layer for a 1-page PDF/print flyer.',
    },
  ];

  function copy(text: string) {
    try {
      void navigator.clipboard.writeText(text);
    } catch {
      // clipboard blocked — user can still select-all
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Copy-ready outreach
      </div>
      <h2 className="mb-1 text-xl font-bold text-slate-900">
        Share-ready templates
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        Pre-formatted copy for LinkedIn, X/Facebook, and a print flyer — built from your course
        overview and your messaging above. Click <em>Copy</em>, paste anywhere, edit as needed.
      </p>

      <div className="space-y-4">
        {templates.map((t) => (
          <div key={t.channel} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-800">{t.channel}</div>
              <button
                type="button"
                onClick={() => copy(t.body)}
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-sans text-xs text-slate-800">
              {t.body}
            </pre>
            {t.note && (
              <div className="mt-2 text-[11px] italic text-slate-500">{t.note}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function OnePagerSection({
  courseContext,
}: {
  courseContext: Record<string, string>;
}) {
  const { proposal, updateSection } = useProposal();
  const notes = proposal.marketing_extras.one_pager_notes;
  const co = proposal.course_overview;
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        One-pager
      </div>
      <h2 className="mb-1 text-xl font-bold text-slate-900">
        Course one-pager to circulate
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        A short summary you can send to prospective learners, partners, and colleagues.
        Structure: hook, who it's for, what they'll leave with, format &amp; dates, next step.
      </p>

      <Field
        label="Working notes for the one-pager"
        hint="Anything you want the Coach to fold in — endorsements, alumni quotes, a specific angle."
      >
        <Textarea
          value={notes}
          onChange={(v) => updateSection('marketing_extras', { one_pager_notes: v })}
          rows={5}
        />
      </Field>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-800">Draft one-pager</div>
        <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-sans text-xs text-slate-800">
{`${(co.course_name || 'Course title').toUpperCase()}
A Thrive Academy course for ${co.intended_audiences || '[audience]'}

WHY THIS COURSE
${notes ? notes.split('\n')[0] : '[Your one-line hook — the Coach can help sharpen it in the Messaging section above.]'}

WHO IT'S FOR
${co.intended_audiences || '[Describe the learner]'}

WHAT YOU'LL LEAVE WITH
${(proposal.design.learning_objectives || '[Learning outcomes from the Course Design workspace]').split('\n').slice(0, 4).map((s) => '• ' + s).join('\n') || '• [Outcome 1]\n• [Outcome 2]\n• [Outcome 3]'}

FORMAT & DATES
${co.course_format || '[Format]'} · ${co.duration || '[Duration]'} · ${co.contact_hours || '[Total hours]'} contact hours

NEXT STEP
Apply at [link] · Questions: [email]`}
        </pre>
      </div>

      <div className="mt-3">
        <CoachButton
          section="one_pager"
          field="marketing"
          fieldLabel="One-pager sharpening"
          currentValue={notes}
          courseContext={courseContext}
          onApplyExample={(v) =>
            updateSection('marketing_extras', {
              one_pager_notes: notes ? notes + '\n\n' + v : v,
            })
          }
        />
      </div>
    </section>
  );
}

const OUTREACH_CHECKLIST_ITEMS = [
  { key: 'social_posts', label: 'Social posts drafted (LinkedIn, X/FB, Instagram)' },
  { key: 'info_session', label: 'Info-session content (slides / talking points)' },
  { key: 'constant_contact', label: 'Constant Contact emails scheduled' },
  { key: 'application', label: 'Application / registration form live' },
  { key: 'georgetown_snippet', label: 'Course snippet sent to Georgetown for approval' },
  { key: 'one_pager', label: 'One-pager PDF circulating' },
  { key: 'partner_orgs', label: 'Partner orgs notified (listservs, associations)' },
  { key: 'faculty_bios', label: 'Faculty bios + headshots collected' },
  { key: 'landing_page', label: 'Landing page live with apply link' },
  { key: 'faq', label: 'FAQ / objection-handler doc' },
];

function OutreachChecklistSection() {
  const { proposal, updateSection } = useProposal();
  const done = proposal.marketing_extras.outreach_checklist_done || {};
  const notes = proposal.marketing_extras.outreach_checklist_notes;
  const total = OUTREACH_CHECKLIST_ITEMS.length;
  const completed = OUTREACH_CHECKLIST_ITEMS.filter((it) => done[it.key]).length;

  function toggle(key: string) {
    updateSection('marketing_extras', {
      outreach_checklist_done: { ...done, [key]: !done[key] },
    });
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Outreach checklist
      </div>
      <h2 className="mb-1 text-xl font-bold text-slate-900">
        Everything you need to launch
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        The stuff that gets a course off the ground — social, info session, emails, Georgetown
        approval, application. Check them off as you go.
        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          {completed} / {total} done
        </span>
      </p>

      <ul className="mb-6 space-y-2">
        {OUTREACH_CHECKLIST_ITEMS.map((it) => (
          <li key={it.key}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100">
              <input
                type="checkbox"
                checked={!!done[it.key]}
                onChange={() => toggle(it.key)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              <span
                className={
                  'text-sm ' +
                  (done[it.key] ? 'text-slate-500 line-through' : 'text-slate-800')
                }
              >
                {it.label}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <Field label="Notes / owners" hint="Who owns each piece? Any deadlines you're tracking?">
        <Textarea
          value={notes}
          onChange={(v) =>
            updateSection('marketing_extras', { outreach_checklist_notes: v })
          }
          rows={4}
        />
      </Field>
    </section>
  );
}

function renderPlanMarkdown(plan: SocialPlan, courseName: string): string {
  const lines: string[] = [];
  lines.push(`# ${plan.campaign_title || `${courseName || 'Course'} — Social Media Marketing Plan`}`);
  lines.push('');
  if (plan.campaign_summary) {
    lines.push(plan.campaign_summary);
    lines.push('');
  }
  for (const w of plan.weeks) {
    lines.push(`## Week ${w.week_number} — ${w.theme}`);
    lines.push(`_Phase: ${w.phase}_`);
    lines.push('');
    if (w.hook) {
      lines.push(`**Hook.** ${w.hook}`);
      lines.push('');
    }
    for (const post of w.posts) {
      lines.push(`### ${post.channel}`);
      lines.push('');
      lines.push(post.body);
      lines.push('');
    }
    lines.push(`### Canva design`);
    if (w.canva.headline) lines.push(`- **Headline:** ${w.canva.headline}`);
    if (w.canva.subhead) lines.push(`- **Subhead:** ${w.canva.subhead}`);
    if (w.canva.details) lines.push(`- **Details:** ${w.canva.details}`);
    if (w.canva.cta) lines.push(`- **CTA:** ${w.canva.cta}`);
    if (w.canva.design_note) lines.push(`- **Design note:** ${w.canva.design_note}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  if (plan.usage_notes.length > 0) {
    lines.push('## Usage notes');
    for (const n of plan.usage_notes) lines.push(`- ${n}`);
    lines.push('');
  }
  return lines.join('\n');
}
