import { useNavigate } from 'react-router-dom';
import { useProposal } from '../hooks/useProposal';
import type { Proposal } from '../types/proposal';

interface ChecklistItem {
  key: string;
  label: string;
  hint: string;
  // Where in the tool to work on it.
  link: { to: string; label: string };
  // True when the proposal already has something entered for this item.
  started?: (p: Proposal) => boolean;
  // Items that also appear on the marketing workspace's outreach checklist share
  // its tick so the two lists never disagree.
  outreachKey?: string;
}

const has = (v: string | undefined) => !!v && v.trim().length > 0;

const MUST_HAVES: ChecklistItem[] = [
  {
    key: 'syllabus',
    label: 'Syllabus',
    hint: 'Schedule, assignments, grading and course policies.',
    link: { to: '/syllabus', label: 'Syllabus builder' },
    started: (p) => p.syllabus.weeks.length > 0 || p.syllabus.assignments.length > 0,
  },
  {
    key: 'modules',
    label: 'Modules designed',
    hint: 'Each module has a name, objectives and the key content.',
    link: { to: '/pedagogy', label: 'Course design' },
    started: (p) => p.design.modules.some((m) => has(m.module_name)),
  },
  {
    key: 'objectives',
    label: 'Learning objectives',
    hint: 'What learners will be able to do by the end of the course.',
    link: { to: '/pedagogy', label: 'Course design' },
    started: (p) =>
      has(p.design.learning_objectives) || p.design.modules.some((m) => m.objectives.length > 0),
  },
  {
    key: 'faculty',
    label: 'Faculty confirmed',
    hint: 'Who is teaching, and they have agreed to the dates.',
    link: { to: '/syllabus', label: 'Syllabus builder' },
    started: (p) => has(p.course_overview.faculty) || has(p.syllabus.instructor_name),
  },
  {
    key: 'dates',
    label: 'Start and end dates set',
    hint: 'Learners need to know when the course runs before they sign up.',
    link: { to: '/syllabus', label: 'Syllabus builder' },
    started: (p) => has(p.syllabus.start_date) || has(p.financials.budget.target_launch_date),
  },
  {
    key: 'price',
    label: 'Price set',
    hint: 'Tuition decided, including any scholarship or employer-sponsored rates.',
    link: { to: '/marketing', label: 'Marketing & pricing' },
    started: (p) => has(p.course_overview.tuition),
  },
  {
    key: 'budget',
    label: 'Course budget complete',
    hint: 'Build and delivery costs covered, with a break-even you are comfortable with.',
    link: { to: '/marketing', label: 'Marketing & pricing' },
    started: (p) =>
      Object.values(p.financials.budget.build).some((items) => items.some((it) => has(it.amount))),
  },
  {
    key: 'registration',
    label: 'A way to register',
    hint: 'Registration or application form is live and takes payment.',
    link: { to: '/marketing', label: 'Marketing & pricing' },
    outreachKey: 'application',
  },
  {
    key: 'course_page',
    label: 'Course page is live',
    hint: 'Course page on the Thrive Center website, linking to registration.',
    link: { to: '/marketing', label: 'Marketing & pricing' },
    started: (p) => has(p.social_plan.landing_url),
    outreachKey: 'landing_page',
  },
  {
    key: 'content_built',
    label: 'Course content built',
    hint: 'Modules are built in Articulate / the learning platform and tested.',
    link: { to: '/articulate-guide', label: 'Articulate guide' },
  },
];

const NICE_TO_HAVES: ChecklistItem[] = [
  {
    key: 'social_posts',
    label: 'Social media posts',
    hint: 'Posts drafted for LinkedIn, X / Facebook and Instagram.',
    link: { to: '/marketing', label: 'Social media plan' },
    outreachKey: 'social_posts',
  },
  {
    key: 'marketing_brief',
    label: 'Marketing brief',
    hint: 'Audience, key messages and headlines in one place.',
    link: { to: '/brief', label: 'Marketing brief' },
  },
  {
    key: 'email_campaign',
    label: 'Email campaign scheduled',
    hint: 'Constant Contact emails ready to go out.',
    link: { to: '/marketing', label: 'Marketing & pricing' },
    outreachKey: 'constant_contact',
  },
  {
    key: 'one_pager',
    label: 'One-pager',
    hint: 'A shareable PDF summary of the course.',
    link: { to: '/marketing', label: 'Marketing & pricing' },
    outreachKey: 'one_pager',
  },
  {
    key: 'info_session',
    label: 'Info session',
    hint: 'Slides or talking points for an information session.',
    link: { to: '/marketing', label: 'Marketing & pricing' },
    outreachKey: 'info_session',
  },
  {
    key: 'partner_orgs',
    label: 'Partner organizations notified',
    hint: 'Listservs, associations and partners who can spread the word.',
    link: { to: '/marketing', label: 'Marketing & pricing' },
    outreachKey: 'partner_orgs',
  },
  {
    key: 'faculty_bios',
    label: 'Faculty bios and headshots',
    hint: 'Ready for the course page and marketing materials.',
    link: { to: '/marketing', label: 'Marketing & pricing' },
    outreachKey: 'faculty_bios',
  },
  {
    key: 'faq',
    label: 'FAQ',
    hint: 'Answers to the questions and hesitations learners usually raise.',
    link: { to: '/marketing', label: 'Marketing & pricing' },
    outreachKey: 'faq',
  },
];

export default function LaunchChecklist() {
  const { proposal, setProposal } = useProposal();
  const navigate = useNavigate();
  const launchDone = proposal.launch_checklist.done;
  const outreachDone = proposal.marketing_extras.outreach_checklist_done || {};

  const isDone = (it: ChecklistItem) =>
    it.outreachKey ? !!outreachDone[it.outreachKey] : !!launchDone[it.key];

  function toggle(it: ChecklistItem) {
    setProposal((prev) => {
      if (it.outreachKey) {
        const done = prev.marketing_extras.outreach_checklist_done || {};
        return {
          ...prev,
          marketing_extras: {
            ...prev.marketing_extras,
            outreach_checklist_done: { ...done, [it.outreachKey]: !done[it.outreachKey] },
          },
        };
      }
      const done = prev.launch_checklist.done;
      return { ...prev, launch_checklist: { done: { ...done, [it.key]: !done[it.key] } } };
    });
  }

  const mustDone = MUST_HAVES.filter(isDone).length;
  const ready = mustDone === MUST_HAVES.length;
  const courseName = proposal.course_overview.course_name || 'your course';

  function renderGroup(
    items: ChecklistItem[],
    title: string,
    blurb: string,
    tone: 'must' | 'nice',
  ) {
    const completed = items.filter(isDone).length;
    const kicker = tone === 'must' ? 'text-rose-700' : 'text-sky-700';
    const pill = tone === 'must' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700';
    return (
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className={'mb-1 text-xs font-semibold uppercase tracking-wide ' + kicker}>{title}</div>
        <p className="mb-6 text-sm text-slate-500">
          {blurb}
          <span className={'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ' + pill}>
            {completed} / {items.length} done
          </span>
        </p>
        <ul className="space-y-2">
          {items.map((it) => {
            const done = isDone(it);
            const started = !done && it.started?.(proposal);
            return (
              <li
                key={it.key}
                className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggle(it)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  <span className="min-w-0">
                    <span
                      className={
                        'block text-sm font-medium ' +
                        (done ? 'text-slate-500 line-through' : 'text-slate-900')
                      }
                    >
                      {it.label}
                      {started && (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-normal text-emerald-700 no-underline">
                          Started in the tool
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500">{it.hint}</span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate(it.link.to)}
                  className="shrink-0 text-xs font-medium text-violet-700 hover:text-violet-900"
                >
                  {it.link.label} →
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Thrive Academy · Launch readiness
            </div>
            <h1 className="text-xl font-bold text-slate-900">Launch readiness checklist</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div
          className={
            'mb-6 rounded-2xl border p-6 ' +
            (ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')
          }
        >
          <h2 className="text-lg font-bold text-slate-900">
            {ready
              ? `${courseName} has every must-have — ready to launch.`
              : `${mustDone} of ${MUST_HAVES.length} must-haves done for ${courseName}.`}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Tick each item off as it's finished. "Started in the tool" means you've entered
            something for it here — check it off once it's final. Your ticks save with the rest
            of your course.
          </p>
        </div>

        {renderGroup(
          MUST_HAVES,
          'Must haves',
          "You can't open registration without these.",
          'must',
        )}
        {renderGroup(
          NICE_TO_HAVES,
          'Nice to haves',
          'These help fill the course. Shared with the outreach checklist in Marketing & pricing.',
          'nice',
        )}
      </main>
    </div>
  );
}
