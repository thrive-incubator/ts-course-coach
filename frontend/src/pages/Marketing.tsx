import { useMemo, useState } from 'react';
import CoachButton from '../components/CoachButton';
import PricingCoach from '../components/PricingCoach';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { Field, Select, TextInput, Textarea } from '../components/Field';
import { useProposal } from '../hooks/useProposal';
import {
  generateMarketingPackage,
  generateSocialPlan,
  humanError,
  type MarketingPackage,
  type SocialPlan,
} from '../services/api';

const COURSE_TYPES = [
  'Year-Long Certificate',
  'Semester-Long Certificate',
  'Mini-Course',
  'Microlearning',
  'Other',
];

const SPARSE_THRESHOLD_CHARS = 120;

function isSparse(text: string): boolean {
  return text.trim().length < SPARSE_THRESHOLD_CHARS;
}

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
            <Field
              label="Course format"
              hint="If the course blends more than one, list them all — e.g. 'In-person + Async', 'Virtual sync + Async with 1 in-person retreat'."
            >
              <TextInput
                value={proposal.course_overview.course_format}
                onChange={(v) => updateSection('course_overview', { course_format: v })}
                placeholder="e.g. Virtual sync + Async"
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

          <p className="mb-4 text-xs italic text-slate-500">
            These three boxes are auto-imported from your Course Conceptualization Form upload.
            If any come in blank or thin, the Coach appears to help you expand or strengthen them.
          </p>

          <Field
            label="Needs statement"
            hint="What practitioner or systemic gap does this course close?"
            coach={
              isSparse(proposal.rationale.needs_statement) ? (
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
              ) : undefined
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
              isSparse(proposal.rationale.evidence_of_demand) ? (
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
              ) : undefined
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
              isSparse(proposal.rationale.competitive_landscape) ? (
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
              ) : undefined
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

        {/* Section 2 — Outreach & enrollment */}
        <div className="mb-4 mt-8">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Section 2
          </div>
          <h2 className="text-xl font-bold text-slate-900">Outreach &amp; enrollment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Where do you find the right people, what's the message that reaches them, and how do
            you select who gets in?
          </p>
        </div>

        <MessagingSection courseContext={courseContext} />
        <OutreachPipelinesSection courseContext={courseContext} />
        <AdmissionsSection />

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
        <AutoMarketingKitSection />
        <OutreachChecklistSection />
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
        run yourself — post-by-post copy and cadence you can drop into your channels.
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
        hint="The problem or missed opportunity the audience already feels."
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
        label="Noteworthy course feature"
        hint="Prominent speaker/faculty names, CEUs, competency crosswalks, capstone projects, alumni outcomes, etc."
      >
        <Textarea
          value={social.differentiators}
          onChange={(v) => updateSection('social_plan', { differentiators: v })}
          rows={4}
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
        Your Talking Points
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

function AdmissionsSection() {
  const { proposal, updateSection } = useProposal();
  const criteria = proposal.enrollment.admissions_criteria;
  const courseName = proposal.course_overview.course_name;
  const skipped = proposal.enrollment.admissions_skip;

  function downloadApplication() {
    const md = renderCourseApplicationMarkdown(courseName, criteria);
    const slug =
      (courseName || 'course')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'course';
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-course-application.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const canGenerate = !skipped && criteria.trim().length > 0;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Admissions
      </div>
      <h2 className="mb-1 text-xl font-bold text-slate-900">
        Admissions criteria &amp; selection process
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        Define who's a fit and how you'll pick them, then generate a ready-to-send
        Course Application built from your criteria.
      </p>

      <Field
        label="Admissions criteria & selection process"
        hint="What will your selection criteria be? And what will your selection process look like?"
      >
        <div className="mb-2 flex items-center gap-2 text-xs">
          <input
            id="admissions-skip"
            type="checkbox"
            checked={skipped}
            onChange={(e) =>
              updateSection('enrollment', { admissions_skip: e.target.checked })
            }
            className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600"
          />
          <label htmlFor="admissions-skip" className="text-slate-600">
            Skip here — no separate admissions criteria for this course
          </label>
        </div>
        {skipped ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs italic text-slate-500">
            Skipped. Open enrollment — anyone who registers can attend.
          </div>
        ) : (
          <Textarea
            value={criteria}
            onChange={(v) => updateSection('enrollment', { admissions_criteria: v })}
            rows={5}
          />
        )}
      </Field>

      <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="mb-2 text-sm font-semibold text-emerald-900">
          Generate a downloadable Course Application
        </div>
        <p className="mb-4 text-xs text-slate-700">
          Builds a full application form using your selection criteria above plus standard
          applicant fields (name, title, organization, email, phone). Downloads as a markdown
          file you can drop into Docs, print, or hand off to your registration system.
        </p>
        <button
          type="button"
          onClick={downloadApplication}
          disabled={!canGenerate}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          title={canGenerate ? undefined : 'Add selection criteria first (or uncheck Skip)'}
        >
          Generate Course Application ↓
        </button>
        {!canGenerate && (
          <p className="mt-2 text-xs italic text-slate-600">
            {skipped
              ? 'Uncheck "Skip" and add your selection criteria to enable.'
              : 'Add your selection criteria above to enable.'}
          </p>
        )}
      </div>
    </section>
  );
}

function renderCourseApplicationMarkdown(courseName: string, criteria: string): string {
  const title = courseName || 'Course';
  const criteriaLines = criteria
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const lines: string[] = [];
  lines.push(`# Course Application: ${title}`);
  lines.push('');
  lines.push(
    'Thank you for your interest in this course. Please complete the sections below. ' +
      'Responses help us confirm fit and prepare for a strong cohort experience.'
  );
  lines.push('');
  lines.push('## Applicant Information');
  lines.push('- **Full name:** ');
  lines.push('- **Preferred pronouns:** ');
  lines.push('- **Title / Role:** ');
  lines.push('- **Organization / Affiliation:** ');
  lines.push('- **Email:** ');
  lines.push('- **Phone:** ');
  lines.push('- **Mailing address:** ');
  lines.push('- **How did you hear about this course?** ');
  lines.push('');
  lines.push('## Professional Background');
  lines.push('Describe your current role and relevant experience (2–3 paragraphs):');
  lines.push('');
  lines.push('_[Your response here]_');
  lines.push('');
  lines.push('## Selection Criteria');
  if (criteriaLines.length > 0) {
    lines.push('This course looks for applicants who meet the following criteria:');
    lines.push('');
    for (const c of criteriaLines) {
      const cleaned = c.replace(/^[-*•]\s*/, '');
      lines.push(`- ${cleaned}`);
    }
    lines.push('');
    lines.push('### Applicant Statement');
    lines.push(
      'Please respond to each criterion above. Describe how your background, current work, ' +
        'and goals align (1–2 paragraphs per criterion).'
    );
    lines.push('');
    lines.push('_[Your responses here]_');
  } else {
    lines.push('_[Selection criteria will appear here once added to the workspace.]_');
  }
  lines.push('');
  lines.push('## Why Now');
  lines.push('Why are you seeking this course at this point in your career? (1 paragraph)');
  lines.push('');
  lines.push('_[Your response here]_');
  lines.push('');
  lines.push('## Commitment & Logistics');
  lines.push('- **Can you attend all scheduled sessions?** Yes / No / Partial (explain)');
  lines.push('- **Tuition sponsorship or scholarship needed?** Yes / No');
  lines.push('- **Accommodations we should be aware of?** ');
  lines.push('');
  lines.push('## Signature');
  lines.push('By submitting this application, I confirm the information above is accurate.');
  lines.push('');
  lines.push('**Signature:** ______________________________');
  lines.push('');
  lines.push('**Date:** ______________________________');
  lines.push('');
  return lines.join('\n');
}

function AutoMarketingKitSection() {
  const { proposal } = useProposal();
  const [pkg, setPkg] = useState<MarketingPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const contentSummary = useMemo(() => summarizeInputs(proposal), [proposal]);
  const hasEnoughInput = contentSummary.filledCount >= 3;

  async function run(isRegen = false) {
    if (isRegen) setRegenerating(true);
    else setLoading(true);
    setError(null);
    try {
      const p = await generateMarketingPackage(proposal);
      setPkg(p);
    } catch (e) {
      setError(humanError(e, 'Could not draft the marketing kit.'));
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  return (
    <section
      id="auto-marketing-kit"
      className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"
    >
      <div className="bg-gradient-to-br from-amber-50 via-rose-50 to-emerald-50 px-8 py-6">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
          Auto-drafted marketing kit
        </div>
        <h2 className="mb-1 text-xl font-bold text-slate-900">
          Turn your course content into a launch kit
        </h2>
        <p className="max-w-2xl text-sm text-slate-700">
          Once you have a working draft — course basics, needs statement, essential
          question, a module or two, your messaging talking points — Coach reads all
          of it and drafts a course one-pager, ready-to-post social copy, an info-session
          outline, an announcement email, a Georgetown catalog snippet, and an FAQ.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!pkg && (
            <button
              type="button"
              onClick={() => run(false)}
              disabled={loading || !hasEnoughInput}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Drafting…' : 'Draft the full marketing kit ✨'}
            </button>
          )}
          {pkg && (
            <button
              type="button"
              onClick={() => run(true)}
              disabled={regenerating}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {regenerating ? 'Redrafting…' : 'Redraft everything'}
            </button>
          )}
          <div className="text-xs text-slate-600">
            Drawing from <strong>{contentSummary.filledCount}</strong> filled sections
            {contentSummary.moduleCount > 0
              ? ` and ${contentSummary.moduleCount} module${
                  contentSummary.moduleCount === 1 ? '' : 's'
                }`
              : ''}
            . Takes about 30 seconds.
          </div>
        </div>
        {!hasEnoughInput && !pkg && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-100/60 px-3 py-2 text-xs text-amber-900">
            Add a bit more first — at minimum fill in the course name, intended
            audience, and either the needs statement or a couple of modules on the
            pedagogy side. The drafts get much better when there's real content to
            pull from.
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-rose-200 bg-rose-50 px-8 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !pkg && (
        <div className="border-t border-slate-200 px-8 py-10 text-center text-sm text-slate-600">
          Reading your course content and drafting the kit…
        </div>
      )}

      {pkg && (
        <div className="border-t border-slate-200 bg-slate-50/40 px-8 py-8 space-y-6">
          <OnePagerCard onePager={pkg.one_pager} />
          <ChannelDraftsBlock drafts={pkg.channel_drafts} />
          <InfoSessionCard session={pkg.info_session} />
          <AnnouncementEmailCard email={pkg.announcement_email} />
          <GeorgetownSnippetCard snippet={pkg.georgetown_snippet} />
          <FaqCard faq={pkg.faq} />
        </div>
      )}
    </section>
  );
}

function summarizeInputs(proposal: ReturnType<typeof useProposal>['proposal']): {
  filledCount: number;
  moduleCount: number;
} {
  const co = proposal.course_overview;
  const r = proposal.rationale;
  const en = proposal.enrollment;
  const me = proposal.marketing_extras;
  const d = proposal.design;
  const checks = [
    !!co.course_name.trim(),
    !!co.intended_audiences.trim(),
    !!co.course_description.trim(),
    !!co.course_format.trim(),
    !!co.duration.trim(),
    !!co.tuition.trim(),
    !!r.needs_statement.trim(),
    !!r.evidence_of_demand.trim(),
    !!r.competitive_landscape.trim(),
    !!en.recruitment.trim(),
    !!en.marketing.trim(),
    !!me.messaging_talking_points.trim(),
    !!d.essential_question.trim(),
    !!d.learning_objectives.trim(),
  ];
  return {
    filledCount: checks.filter(Boolean).length,
    moduleCount: d.modules.length,
  };
}

function CopyPill({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        try {
          void navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1400);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
    >
      {ok ? 'Copied' : label}
    </button>
  );
}

function OnePagerCard({ onePager }: { onePager: MarketingPackage['one_pager'] }) {
  const combined =
    `${onePager.headline}\n${onePager.subhead}\n\n` +
    `${onePager.elevator_pitch}\n\n` +
    `WHO IT'S FOR\n${onePager.who_its_for.map((b) => '• ' + b).join('\n')}\n\n` +
    `WHAT YOU'LL LEAVE WITH\n${onePager.what_youll_leave_with.map((b) => '• ' + b).join('\n')}\n\n` +
    `FORMAT & DATES\n${onePager.format_and_dates}\n\n` +
    `TUITION\n${onePager.tuition_line}\n\n` +
    `FACULTY\n${onePager.faculty_line}\n\n` +
    `WHY NOW\n${onePager.why_now}\n\n` +
    `${onePager.cta}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Course one-pager
        </div>
        <CopyPill text={combined} label="Copy one-pager" />
      </div>
      <div className="px-6 py-6">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          One-pager
        </div>
        <h3 className="mb-2 text-2xl font-bold leading-tight text-slate-900">
          {onePager.headline}
        </h3>
        <p className="mb-6 text-base text-slate-700">{onePager.subhead}</p>
        <p className="mb-6 border-l-4 border-amber-400 pl-4 text-sm italic text-slate-700">
          {onePager.elevator_pitch}
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Who it's for
            </div>
            <ul className="space-y-1.5 text-sm text-slate-800">
              {onePager.who_its_for.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              What you'll leave with
            </div>
            <ul className="space-y-1.5 text-sm text-slate-800">
              {onePager.what_youll_leave_with.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Format & dates
            </div>
            <div className="text-slate-800">{onePager.format_and_dates || '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Tuition
            </div>
            <div className="text-slate-800">{onePager.tuition_line || '—'}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Faculty
            </div>
            <div className="text-slate-800">{onePager.faculty_line || '—'}</div>
          </div>
        </div>

        {onePager.why_now && (
          <div className="mt-6">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Why now
            </div>
            <p className="text-sm text-slate-800">{onePager.why_now}</p>
          </div>
        )}

        {onePager.cta && (
          <div className="mt-6 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white">
            {onePager.cta}
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelDraftsBlock({ drafts }: { drafts: MarketingPackage['channel_drafts'] }) {
  if (!drafts.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
        Copy-ready posts
      </div>
      <h3 className="mb-4 text-lg font-bold text-slate-900">Social & flyer copy</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {drafts.map((d, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">{d.channel}</div>
              <CopyPill text={d.body} />
            </div>
            <pre className="flex-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-sans text-xs leading-relaxed text-slate-800">
              {d.body}
            </pre>
            {d.length_note && (
              <div className="mt-2 text-[11px] italic text-slate-500">{d.length_note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoSessionCard({ session }: { session: MarketingPackage['info_session'] }) {
  const md =
    `# ${session.title || 'Info session'}\n` +
    `_${session.duration_minutes} minutes_\n\n` +
    `## Agenda\n${session.agenda.map((a) => '- ' + a).join('\n')}\n\n` +
    `## Talking points\n${session.talking_points.map((a) => '- ' + a).join('\n')}\n\n` +
    `## Anticipated questions\n${session.audience_questions.map((a) => '- ' + a).join('\n')}\n`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Info session outline
        </div>
        <CopyPill text={md} label="Copy outline" />
      </div>
      <h3 className="mb-1 text-lg font-bold text-slate-900">{session.title || 'Info session'}</h3>
      <div className="mb-5 text-xs text-slate-500">{session.duration_minutes} minutes</div>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Agenda
          </div>
          <ol className="space-y-1.5 text-sm text-slate-800">
            {session.agenda.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-slate-400">{i + 1}.</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Talking points
          </div>
          <ul className="space-y-1.5 text-sm text-slate-800">
            {session.talking_points.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Likely audience questions
          </div>
          <ul className="space-y-1.5 text-sm text-slate-800">
            {session.audience_questions.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 text-slate-400">?</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AnnouncementEmailCard({ email }: { email: MarketingPackage['announcement_email'] }) {
  const full = `Subject: ${email.subject}\n\n${email.body}`;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Announcement email (Constant Contact-ready)
        </div>
        <div className="flex gap-2">
          <CopyPill text={email.subject} label="Copy subject" />
          <CopyPill text={email.body} label="Copy body" />
          <CopyPill text={full} label="Copy all" />
        </div>
      </div>
      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Subject
        </div>
        <div className="text-sm font-semibold text-slate-900">{email.subject}</div>
        {email.preview && (
          <div className="mt-1 text-xs italic text-slate-500">Preview: {email.preview}</div>
        )}
      </div>
      <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 font-sans text-sm leading-relaxed text-slate-800">
        {email.body}
      </pre>
    </div>
  );
}

function GeorgetownSnippetCard({ snippet }: { snippet: string }) {
  if (!snippet) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Georgetown catalog snippet
        </div>
        <CopyPill text={snippet} label="Copy snippet" />
      </div>
      <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
        {snippet}
      </p>
      <p className="mt-2 text-[11px] italic text-slate-500">
        Formal register — paste into the internal approval doc or the catalog listing.
      </p>
    </div>
  );
}

function FaqCard({ faq }: { faq: MarketingPackage['faq'] }) {
  if (!faq.length) return null;
  const md = faq.map((f) => `**${f.question}**\n${f.answer}`).join('\n\n');
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Anticipated FAQs
        </div>
        <CopyPill text={md} label="Copy all Q&As" />
      </div>
      <h3 className="mb-4 text-lg font-bold text-slate-900">Questions learners will ask</h3>
      <ul className="space-y-3">
        {faq.map((f, i) => (
          <li key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-1 text-sm font-semibold text-slate-900">{f.question}</div>
            <div className="text-sm text-slate-700">{f.answer}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const OUTREACH_CHECKLIST_ITEMS = [
  { key: 'social_posts', label: 'Social posts drafted (LinkedIn, X/FB, Instagram)' },
  { key: 'info_session', label: 'Info-session content (slides / talking points)' },
  { key: 'constant_contact', label: 'Constant Contact emails scheduled' },
  { key: 'application', label: 'Application / registration form live' },
  { key: 'georgetown_snippet', label: 'Georgetown course catalog description drafted' },
  { key: 'one_pager', label: 'One-pager PDF circulating' },
  { key: 'partner_orgs', label: 'Partner orgs notified (listservs, associations)' },
  { key: 'faculty_bios', label: 'Faculty bios + headshots collected' },
  { key: 'landing_page', label: 'Course marketing/registration page on Thrive Center website is live and includes relevant links' },
  { key: 'faq', label: 'FAQ / objection-handler doc' },
];

function OutreachChecklistSection() {
  const { proposal, updateSection } = useProposal();
  const done = proposal.marketing_extras.outreach_checklist_done || {};
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
        The following items help get the word out about your course. While not all of these
        items are required, they provide a useful framework for your outreach strategy.
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
