import { useState } from 'react';
import { Field, TextInput } from './Field';
import { downloadBudgetXlsx, humanError } from '../services/api';
import {
  ASYNC_TASK_KEYS,
  BUILD_LINE_KEYS,
  HYBRID_LINE_KEYS,
  type AsyncTaskKey,
  type BudgetAsyncTask,
  type BudgetCourseType,
  type BudgetFacultyDirector,
  type BudgetItem,
  type BudgetLine,
  type BudgetRevenueLine,
  type BuildLineKey,
  type CourseBudget,
  type HybridLineKey,
  emptyItem,
} from '../types/proposal';

// Rates from the Thrive Academy Course Budget Worksheet (FY27).
const PHASE1_ALLOCATION = 10000;
const FRINGE_RATE = 0.37;
const INFRASTRUCTURE_RATE = 0.3;
const ADMIN_SUPPORT_RATE = 0.15;
// Same formula as Analyze pricing: 10 contact hours = 1 CE.
const CONTACT_HOURS_PER_CE = 10;
const RATE_PER_CE: Record<'hybrid' | 'async', number> = { hybrid: 300, async: 60 };
const MAX_FACULTY = 4;

interface Props {
  courseTitle: string;
  tuition: string;
  contactHours: string;
  contactHoursLive: string;
  contactHoursVirtualSync: string;
  contactHoursAsync: string;
  budget: CourseBudget;
  onChange: (budget: CourseBudget) => void;
}

// Pull a number out of free text like "$1,200", "12", "1.5".
function num(v: string): number {
  const m = (v || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

// Same as num(), but blank stays blank so the worksheet cell stays empty.
function numOrNull(v: string): number | null {
  return (v || '').trim() ? num(v) : null;
}

function money(n: number): string {
  const rounded = Math.round(n);
  const s = `$${Math.abs(rounded).toLocaleString('en-US')}`;
  return rounded < 0 ? `(${s})` : s;
}

const lineTotal = (l: BudgetLine) => num(l.quantity) * num(l.rate);
const itemsTotal = (items: BudgetItem[]) => items.reduce((sum, it) => sum + num(it.amount), 0);

type RevenueKey = 'employer_sponsored' | 'self_pay' | 'scholarship';

const REVENUE_LINES: { key: RevenueKey; label: string; question: string }[] = [
  {
    key: 'employer_sponsored',
    label: 'Employer-sponsored tuition',
    question: 'How many learners do you expect to be sponsored by their employer?',
  },
  {
    key: 'self_pay',
    label: 'Self-pay tuition',
    question: 'How many learners do you expect to pay for themselves?',
  },
  {
    key: 'scholarship',
    label: 'Scholarship-supported tuition',
    question: 'How many learners do you expect to attend on a scholarship?',
  },
];

interface LineSpec {
  label: string;
  hint: string;
  quantity: string;
  rate: string;
}

interface BuildSpec {
  label: string;
  hint: string;
  name: string;
  namePlaceholder: string;
  amount: string;
  addLabel: string;
}

// People lines capture Name / Allocation; purchase lines capture Description / Cost.
const PERSON = { amount: 'Allocation' };
const PURCHASE = { name: 'Description', amount: 'Cost', addLabel: '+ Add another item' };

const BUILD_LINES: Record<BuildLineKey, BuildSpec> = {
  faculty_salaries: {
    ...PERSON,
    label: 'Faculty director salaries — course design & content development',
    hint: 'One line per faculty director. Fringe is added automatically.',
    name: 'Faculty name',
    namePlaceholder: 'e.g. Dr. Jane Smith',
    addLabel: '+ Add another faculty director',
  },
  subject_matter_experts: {
    ...PERSON,
    label: 'Subject matter experts / content contributors',
    hint: 'Outside experts who help write or review content.',
    name: 'Name',
    namePlaceholder: 'Expert name',
    addLabel: '+ Add another expert',
  },
  instructional_design: {
    ...PERSON,
    label: 'Instructional design assistance',
    hint: 'Course mapping, learning objectives, assessment design, LMS build.',
    name: 'Name',
    namePlaceholder: 'Designer or firm',
    addLabel: '+ Add another',
  },
  media_production: {
    ...PERSON,
    label: 'Media production',
    hint: 'Video recording/editing, narration, graphics, captioning.',
    name: 'Name',
    namePlaceholder: 'Producer, vendor, or studio',
    addLabel: '+ Add another',
  },
  technology: {
    ...PURCHASE,
    label: 'Technology / software / LMS setup',
    hint: 'Licenses, tools, or platform setup needed to build the course.',
    namePlaceholder: 'e.g. Articulate 360 license',
  },
  materials_licensing: {
    ...PURCHASE,
    label: 'Course materials & content licensing',
    hint: 'Readings, case studies, images, or other licensed content.',
    namePlaceholder: 'e.g. HBS case study',
  },
  other: {
    ...PURCHASE,
    label: 'Other build expenses',
    hint: 'Anything else you need to build the course.',
    namePlaceholder: 'What is it?',
  },
};

const HYBRID_LINES: Record<HybridLineKey, LineSpec> = {
  faculty_teaching: {
    label: 'Faculty director salaries — teaching',
    hint: 'Pay for teaching the live sessions. Fringe is added automatically.',
    quantity: 'Sessions or hours',
    rate: 'Pay per session / hour',
  },
  guest_speakers: {
    label: 'Community speakers / guest lecturers',
    hint: 'If applicable.',
    quantity: 'Number of speakers',
    rate: 'Honorarium each',
  },
  teaching_assistants: {
    label: 'Teaching assistants / facilitators',
    hint: 'Support for breakout groups, grading, or live session facilitation.',
    quantity: 'Hours or people',
    rate: 'Rate',
  },
  in_person_sessions: {
    label: 'In-person session costs',
    hint: 'Venue, catering, A/V, parking, printing for live sessions.',
    quantity: 'Sessions',
    rate: 'Cost per session',
  },
  participant_materials: {
    label: 'Participant course materials',
    hint: 'Per-cohort materials, kits, or readings.',
    quantity: 'Participants or kits',
    rate: 'Cost each',
  },
  other: {
    label: 'Other delivery expenses',
    hint: 'Describe it in the notes.',
    quantity: 'Quantity',
    rate: 'Cost each',
  },
};

const ASYNC_TASKS: Record<AsyncTaskKey, string> = {
  discussion_boards: 'Monitoring & responding to discussion boards',
  learner_questions: 'Answering learner questions (email / messages)',
  grading: 'Grading assignments or reviewing assessments',
  office_hours: 'Virtual office hours or optional live Q&A',
  completion_review: 'Reviewing completion / certificate eligibility',
  evaluations_review: 'Reviewing learner evaluations & feedback',
  content_updates: 'Content review and updates (accuracy, currency)',
  other: 'Other faculty task (describe)',
};

// Best guess at the course type from the Course Basics contact-hours breakdown.
function inferCourseType(p: Props): 'hybrid' | 'async' | null {
  if (num(p.contactHoursLive) > 0 || num(p.contactHoursVirtualSync) > 0) return 'hybrid';
  if (num(p.contactHoursAsync) > 0) return 'async';
  return null;
}

export default function BudgetBuilder(props: Props) {
  const { courseTitle, tuition, budget, onChange } = props;
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inferred = inferCourseType(props);
  const courseType = budget.course_type || inferred;
  const contactHours = num(props.contactHours);
  const ce = +(contactHours / CONTACT_HOURS_PER_CE).toFixed(2);

  // Tuition comes from the pricing formula for the selected course type; fall back
  // to the Tuition field when contact hours or type aren't known yet.
  const tuitionUsd = courseType && contactHours > 0 ? ce * RATE_PER_CE[courseType] : num(tuition);

  // A blank per-learner rate means "use the course tuition".
  const rateFor = (line: BudgetRevenueLine) => (line.rate.trim() ? num(line.rate) : tuitionUsd);
  const revenueFor = (line: BudgetRevenueLine) => num(line.learners) * rateFor(line);
  const revenue = REVENUE_LINES.reduce((sum, l) => sum + revenueFor(budget[l.key]), 0);

  // Phase 1 — Course Building.
  const buildFringe = itemsTotal(budget.build.faculty_salaries) * FRINGE_RATE;
  const phase1 =
    BUILD_LINE_KEYS.reduce((sum, k) => sum + itemsTotal(budget.build[k]), 0) + buildFringe;
  const phase1Remaining = PHASE1_ALLOCATION - phase1;

  // Phase 2 — Course Delivery, 2A (hybrid) or 2B (fully asynchronous).
  const hybridFringe = lineTotal(budget.hybrid.faculty_teaching) * FRINGE_RATE;
  const hybridTotal =
    HYBRID_LINE_KEYS.reduce((sum, k) => sum + lineTotal(budget.hybrid[k]), 0) + hybridFringe;
  const hourlyRate = num(budget.async_hourly_rate);
  const taskCost = (t: BudgetAsyncTask) => (t.performs === 'yes' ? num(t.hours) * hourlyRate : 0);
  const asyncTasksTotal = ASYNC_TASK_KEYS.reduce((sum, k) => sum + taskCost(budget.async_tasks[k]), 0);
  const asyncHours = ASYNC_TASK_KEYS.reduce(
    (sum, k) => sum + (budget.async_tasks[k].performs === 'yes' ? num(budget.async_tasks[k].hours) : 0),
    0,
  );
  const asyncFringe = asyncTasksTotal * FRINGE_RATE;
  const asyncTotal = asyncTasksTotal + asyncFringe;
  const phase2 = courseType === 'hybrid' ? hybridTotal : courseType === 'async' ? asyncTotal : 0;

  // Operating summary — same lines as the worksheet.
  const infrastructure = revenue * INFRASTRUCTURE_RATE;
  const admin = revenue * ADMIN_SUPPORT_RATE;
  const deliveryExpenses = phase2 + infrastructure + admin;
  const balance = revenue - deliveryExpenses;
  const margin = revenue ? balance / revenue : 0;
  const netAfterBuild = balance - phase1;

  // Break-even: infrastructure + admin scale with revenue (45%), delivery costs are fixed.
  const totalLearners = REVENUE_LINES.reduce((sum, l) => sum + num(budget[l.key].learners), 0);
  const avgRate = totalLearners ? revenue / totalLearners : tuitionUsd;
  const contributionRate = 1 - INFRASTRUCTURE_RATE - ADMIN_SUPPORT_RATE;
  const breakEvenRevenue = phase2 / contributionRate;
  const breakEvenLearners = phase2 > 0 && avgRate > 0 ? Math.ceil(breakEvenRevenue / avgRate) : 0;
  const recoverBuildLearners =
    phase1 > 0 && avgRate > 0 ? Math.ceil((phase2 + phase1) / contributionRate / avgRate) : 0;

  // Faculty distribution check against the salary lines.
  const facultyBuild = budget.faculty_directors.reduce((sum, fd) => sum + num(fd.build), 0);
  const facultyDelivery = budget.faculty_directors.reduce((sum, fd) => sum + num(fd.delivery), 0);
  const buildSalaryLine = itemsTotal(budget.build.faculty_salaries);
  const deliverySalaryLine =
    courseType === 'hybrid'
      ? lineTotal(budget.hybrid.faculty_teaching)
      : courseType === 'async'
        ? asyncTasksTotal
        : 0;

  const set = (patch: Partial<CourseBudget>) => onChange({ ...budget, ...patch });
  const setRevenue = (key: RevenueKey, patch: Partial<BudgetRevenueLine>) =>
    set({ [key]: { ...budget[key], ...patch } } as Partial<CourseBudget>);
  const setBuildItems = (key: BuildLineKey, items: BudgetItem[]) =>
    set({ build: { ...budget.build, [key]: items } });
  const setHybrid = (key: HybridLineKey, patch: Partial<BudgetLine>) =>
    set({ hybrid: { ...budget.hybrid, [key]: { ...budget.hybrid[key], ...patch } } });
  const setTask = (key: AsyncTaskKey, patch: Partial<BudgetAsyncTask>) =>
    set({ async_tasks: { ...budget.async_tasks, [key]: { ...budget.async_tasks[key], ...patch } } });
  const setFaculty = (i: number, patch: Partial<BudgetFacultyDirector>) =>
    set({
      faculty_directors: budget.faculty_directors.map((fd, j) => (j === i ? { ...fd, ...patch } : fd)),
    });

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const lines = (src: Record<string, BudgetLine>) =>
        Object.fromEntries(
          Object.entries(src).map(([k, l]) => [
            k,
            { quantity: numOrNull(l.quantity), rate: numOrNull(l.rate), notes: l.notes },
          ]),
        );
      const revenueLine = (l: BudgetRevenueLine) => ({
        learners: num(l.learners),
        rate: numOrNull(l.rate),
        notes: l.notes,
      });
      const blob = await downloadBudgetXlsx({
        course_title: courseTitle,
        course_format:
          courseType === 'hybrid' ? 'Hybrid' : courseType === 'async' ? 'Fully Asynchronous' : '',
        target_launch_date: budget.target_launch_date,
        prepared_by: budget.prepared_by,
        contact_hours: contactHours > 0 ? contactHours : null,
        tuition: tuitionUsd,
        employer_sponsored: revenueLine(budget.employer_sponsored),
        self_pay: revenueLine(budget.self_pay),
        scholarship: revenueLine(budget.scholarship),
        additional_revenue: numOrNull(budget.additional_revenue),
        additional_revenue_notes: budget.additional_revenue_notes,
        build: Object.fromEntries(
          BUILD_LINE_KEYS.map((k) => [
            k,
            budget.build[k]
              .filter((it) => it.name.trim() || it.amount.trim() || it.notes.trim())
              .map((it) => ({ name: it.name, amount: numOrNull(it.amount), notes: it.notes })),
          ]),
        ),
        hybrid: lines(budget.hybrid),
        async_hourly_rate: numOrNull(budget.async_hourly_rate),
        async_tasks: Object.fromEntries(
          ASYNC_TASK_KEYS.map((k) => {
            const t = budget.async_tasks[k];
            return [
              k,
              {
                performs: t.performs === '' ? null : t.performs === 'yes',
                hours: numOrNull(t.hours),
                scope: t.scope,
              },
            ];
          }),
        ),
        faculty_directors: budget.faculty_directors.map((fd) => ({
          name: fd.name,
          build: numOrNull(fd.build),
          delivery: numOrNull(fd.delivery),
          role: fd.role,
        })),
      });
      const slug =
        (courseTitle || 'course')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'course';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-course-budget.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(humanError(e, 'Could not create the budget.'));
    } finally {
      setDownloading(false);
    }
  }

  const row = (label: string, value: number, strong = false) => (
    <div className={`flex justify-between py-1 ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );

  const choiceClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm font-medium ${
      active
        ? 'border-emerald-500 bg-emerald-600 text-white'
        : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400'
    }`;

  const lineCard = (
    spec: LineSpec,
    line: BudgetLine,
    onLine: (patch: Partial<BudgetLine>) => void,
    fringe?: number,
  ) => (
    <div key={spec.label} className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-900">{spec.label}</div>
      <p className="mb-3 text-xs text-slate-500">{spec.hint}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label={spec.quantity}>
          <TextInput value={line.quantity} onChange={(v) => onLine({ quantity: v })} />
        </Field>
        <Field label={spec.rate}>
          <TextInput value={line.rate} onChange={(v) => onLine({ rate: v })} placeholder="$" />
        </Field>
        <Field label="Notes / assumptions">
          <TextInput value={line.notes} onChange={(v) => onLine({ notes: v })} />
        </Field>
      </div>
      <div className="-mt-3 text-right text-sm text-slate-700">
        {fringe !== undefined && fringe > 0 && (
          <span className="mr-3 text-xs text-slate-500">+ {money(fringe)} fringe (37%)</span>
        )}
        Subtotal: <strong>{money(lineTotal(line))}</strong>
      </div>
    </div>
  );

  const buildCard = (k: BuildLineKey) => {
    const spec = BUILD_LINES[k];
    const items = budget.build[k];
    const update = (i: number, patch: Partial<BudgetItem>) =>
      setBuildItems(k, items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
    return (
      <div key={k} className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium text-slate-900">{spec.label}</div>
        <p className="mb-3 text-xs text-slate-500">{spec.hint}</p>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1.3fr_1fr_1.5fr_auto]">
            <Field label={spec.name}>
              <TextInput
                value={it.name}
                onChange={(v) => update(i, { name: v })}
                placeholder={spec.namePlaceholder}
              />
            </Field>
            <Field label={spec.amount}>
              <TextInput value={it.amount} onChange={(v) => update(i, { amount: v })} placeholder="$" />
            </Field>
            <Field label="Notes / assumptions">
              <TextInput value={it.notes} onChange={(v) => update(i, { notes: v })} />
            </Field>
            <div className="mb-6 pb-2 text-xs">
              {items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setBuildItems(k, items.filter((_, j) => j !== i))}
                  className="text-rose-600 hover:underline"
                >
                  Remove
                </button>
              ) : (
                <span className="invisible">Remove</span>
              )}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setBuildItems(k, [...items, emptyItem()])}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-400"
          >
            {spec.addLabel}
          </button>
          <div className="text-sm text-slate-700">
            {k === 'faculty_salaries' && buildFringe > 0 && (
              <span className="mr-3 text-xs text-slate-500">+ {money(buildFringe)} fringe (37%)</span>
            )}
            Subtotal: <strong>{money(itemsTotal(items))}</strong>
          </div>
        </div>
      </div>
    );
  };

  const sectionTitle = (text: string) => (
    <div className="mb-2 mt-6 text-sm font-semibold text-slate-800">{text}</div>
  );

  return (
    <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Course budget
      </div>
      <h3 className="text-lg font-bold text-slate-900">Build your course budget</h3>
      <p className="mt-1 mb-5 text-sm text-slate-600">
        Answer the questions below to fill in the Thrive Academy Course Budget Worksheet. Every
        course is budgeted in two phases: <strong>Course Building</strong> has a fixed $10,000
        allocation, and <strong>Course Delivery</strong> is allocated by the management team based
        on course format and complexity.
      </p>

      {sectionTitle('1. Course information')}
      <Field
        label="Course type"
        hint="This sets the tuition rate and which Course Delivery questions you'll answer."
      >
        <div className="flex flex-wrap gap-2">
          {(['hybrid', 'async'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set({ course_type: t as BudgetCourseType })}
              className={choiceClass(courseType === t)}
            >
              {t === 'hybrid' ? 'Hybrid (any synchronous time)' : 'Fully asynchronous'}
            </button>
          ))}
        </div>
        {!budget.course_type && inferred && (
          <p className="mt-2 text-xs text-slate-500">
            Pre-selected from your Contact hours by mode in Course Basics.
          </p>
        )}
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Target launch date">
          <TextInput
            value={budget.target_launch_date}
            onChange={(v) => set({ target_launch_date: v })}
            placeholder="e.g. January 2027"
          />
        </Field>
        <Field label="Prepared by">
          <TextInput value={budget.prepared_by} onChange={(v) => set({ prepared_by: v })} />
        </Field>
      </div>

      {sectionTitle('2. Revenue')}
      <p className="mb-3 text-xs text-slate-500">
        Tuition per learner is{' '}
        {tuitionUsd ? (
          <>
            <strong>{money(tuitionUsd)}</strong>
            {courseType && contactHours > 0 &&
              ` (${contactHours} contact hours = ${ce} CE × $${RATE_PER_CE[courseType]}/CE)`}
          </>
        ) : (
          'set by the pricing formula above'
        )}
        . Change the rate on a line only if those learners pay a different amount.
      </p>
      {REVENUE_LINES.map(({ key, label, question }) => (
        <div key={key} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-sm font-medium text-slate-900">{label}</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Learners" hint={question}>
              <TextInput
                value={budget[key].learners}
                onChange={(v) => setRevenue(key, { learners: v })}
                placeholder="e.g. 10"
              />
            </Field>
            <Field label="Tuition per learner" hint="Leave blank to use the course tuition.">
              <TextInput
                value={budget[key].rate}
                onChange={(v) => setRevenue(key, { rate: v })}
                placeholder={tuitionUsd ? money(tuitionUsd) : '$'}
              />
            </Field>
            <Field label="Notes / assumptions">
              <TextInput value={budget[key].notes} onChange={(v) => setRevenue(key, { notes: v })} />
            </Field>
          </div>
          <div className="text-right text-sm text-slate-700">
            Subtotal: <strong>{money(revenueFor(budget[key]))}</strong>
          </div>
        </div>
      ))}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Anticipated additional revenue"
          hint="Grants, sponsorships, or other funds you expect but aren't counting on. Not included in the base budget."
        >
          <TextInput
            value={budget.additional_revenue}
            onChange={(v) => set({ additional_revenue: v })}
            placeholder="e.g. $5,000"
          />
        </Field>
        <Field label="Where would it come from?">
          <TextInput
            value={budget.additional_revenue_notes}
            onChange={(v) => set({ additional_revenue_notes: v })}
          />
        </Field>
      </div>

      {sectionTitle('3. Phase 1 — Course Building ($10,000 allocation)')}
      <p className="mb-3 text-xs text-slate-500">Budget everything needed to build the course.</p>
      {BUILD_LINE_KEYS.map(buildCard)}
      <div
        className={`rounded-lg border p-3 text-sm ${
          phase1Remaining < 0
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-emerald-200 bg-white text-slate-700'
        }`}
      >
        Phase 1 total: <strong>{money(phase1)}</strong> of $10,000 —{' '}
        {phase1Remaining < 0
          ? `${money(-phase1Remaining)} over allocation. Reduce build costs or request approval.`
          : `${money(phase1Remaining)} remaining.`}
      </div>

      {sectionTitle('4. Phase 2 — Course Delivery')}
      <p className="mb-3 text-xs text-slate-500">
        The management team sets the Course Delivery allocation after review, so there's no cap to
        work against here — just estimate what delivery will cost.
      </p>
      {!courseType && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Choose a course type in step 1 to see the Course Delivery questions.
        </p>
      )}
      {courseType === 'hybrid' && (
        <>
          <p className="mb-3 text-sm text-slate-700">
            <strong>Hybrid course:</strong> faculty teaching and delivery expenses.
          </p>
          {HYBRID_LINE_KEYS.map((k) =>
            lineCard(
              HYBRID_LINES[k],
              budget.hybrid[k],
              (patch) => setHybrid(k, patch),
              k === 'faculty_teaching' ? hybridFringe : undefined,
            ),
          )}
        </>
      )}
      {courseType === 'async' && (
        <>
          <p className="mb-3 text-sm text-slate-700">
            <strong>Fully asynchronous course:</strong> once the course is live, will faculty do
            any of the tasks below? Answer Yes or No for each, estimate the hours for the delivery
            period, and describe the scope and frequency.
          </p>
          <div className="mb-3 max-w-xs">
            <Field label="Faculty hourly rate for post-launch work">
              <TextInput
                value={budget.async_hourly_rate}
                onChange={(v) => set({ async_hourly_rate: v })}
                placeholder="e.g. $75"
              />
            </Field>
          </div>
          {ASYNC_TASK_KEYS.map((k) => {
            const t = budget.async_tasks[k];
            return (
              <div key={k} className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-slate-900">{ASYNC_TASKS[k]}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTask(k, { performs: 'yes' })}
                      className={choiceClass(t.performs === 'yes')}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setTask(k, { performs: 'no' })}
                      className={choiceClass(t.performs === 'no')}
                    >
                      No
                    </button>
                  </div>
                </div>
                {t.performs === 'yes' && (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
                      <Field label="Estimated hours">
                        <TextInput
                          value={t.hours}
                          onChange={(v) => setTask(k, { hours: v })}
                          placeholder="e.g. 20"
                        />
                      </Field>
                      <Field label="Scope & frequency" hint="e.g. weekly, per cohort, annually">
                        <TextInput value={t.scope} onChange={(v) => setTask(k, { scope: v })} />
                      </Field>
                    </div>
                    <div className="-mt-3 text-right text-sm text-slate-700">
                      Subtotal: <strong>{money(taskCost(t))}</strong>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          <p className="text-right text-xs text-slate-500">
            {asyncHours} faculty hours · + {money(asyncFringe)} fringe (37%)
          </p>
        </>
      )}
      {courseType && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 text-sm text-slate-700">
          Phase 2 total ({courseType === 'hybrid' ? 'hybrid' : 'fully asynchronous'}):{' '}
          <strong>{money(phase2)}</strong>
        </div>
      )}

      {sectionTitle('5. Faculty director distribution')}
      <p className="mb-3 text-xs text-slate-500">
        How is build and delivery pay split among faculty? Fringe is added at the 37% Georgetown
        rate.
      </p>
      {budget.faculty_directors.map((fd, i) => (
        <div key={i} className="mb-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_1.5fr_auto]">
          <Field label="Faculty director">
            <TextInput value={fd.name} onChange={(v) => setFaculty(i, { name: v })} placeholder="Name" />
          </Field>
          <Field label="Phase 1 build pay">
            <TextInput value={fd.build} onChange={(v) => setFaculty(i, { build: v })} placeholder="$" />
          </Field>
          <Field label="Phase 2 delivery pay">
            <TextInput
              value={fd.delivery}
              onChange={(v) => setFaculty(i, { delivery: v })}
              placeholder="$"
            />
          </Field>
          <Field label="Engagement period / role">
            <TextInput
              value={fd.role}
              onChange={(v) => setFaculty(i, { role: v })}
              placeholder="e.g. Jan–May 2027, builds modules 1–3"
            />
          </Field>
          <div className="mb-6 pb-2 text-xs text-slate-500">
            + {money((num(fd.build) + num(fd.delivery)) * FRINGE_RATE)} fringe
            {budget.faculty_directors.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  set({ faculty_directors: budget.faculty_directors.filter((_, j) => j !== i) })
                }
                className="ml-2 text-rose-600 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
      {budget.faculty_directors.length < MAX_FACULTY && (
        <button
          type="button"
          onClick={() =>
            set({
              faculty_directors: [
                ...budget.faculty_directors,
                { name: '', build: '', delivery: '', role: '' },
              ],
            })
          }
          className="mb-4 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-400"
        >
          + Add another faculty director
        </button>
      )}
      {(facultyBuild > 0 || facultyDelivery > 0) && (
        <div className="mb-4 space-y-1 text-xs">
          <div className={Math.round(facultyBuild - buildSalaryLine) === 0 ? 'text-emerald-700' : 'text-rose-700'}>
            {Math.round(facultyBuild - buildSalaryLine) === 0 ? '✓' : '≠'} Build pay {money(facultyBuild)}{' '}
            vs. Phase 1 faculty salary line {money(buildSalaryLine)}
          </div>
          {courseType && (
            <div
              className={
                Math.round(facultyDelivery - deliverySalaryLine) === 0 ? 'text-emerald-700' : 'text-rose-700'
              }
            >
              {Math.round(facultyDelivery - deliverySalaryLine) === 0 ? '✓' : '≠'} Delivery pay{' '}
              {money(facultyDelivery)} vs. Phase 2{' '}
              {courseType === 'hybrid' ? 'teaching salary line' : 'post-launch faculty tasks'}{' '}
              {money(deliverySalaryLine)}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-emerald-300 bg-white p-5 text-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Operating summary
        </div>
        {row('Current projected revenue', revenue, true)}
        <div className="my-2 border-t border-slate-100" />
        {row('Phase 2 — Course Delivery costs', phase2)}
        {row('THRIVE infrastructure (30% of revenue)', infrastructure)}
        {row('Administrative support (15% of revenue)', admin)}
        {row('Total delivery-year expenses', deliveryExpenses, true)}
        <div className="my-2 border-t border-slate-100" />
        {row('Projected operating balance (delivery)', balance, true)}
        <div className="flex justify-between py-1 text-slate-700">
          <span>Operating margin (delivery)</span>
          <span>{(margin * 100).toFixed(1)}%</span>
        </div>
        {row('Phase 1 — Course Building investment', phase1)}
        {row('Net balance after build investment', netAfterBuild, true)}

        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Break-even point
          </div>
          {breakEvenLearners > 0 ? (
            <>
              <div className="text-base font-semibold text-slate-900">
                {breakEvenLearners} learner{breakEvenLearners === 1 ? '' : 's'} (
                {money(breakEvenRevenue)} in tuition revenue)
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Course Delivery costs of {money(phase2)}, covered after the 30% infrastructure and
                15% administrative support lines, at {totalLearners ? 'your average' : 'the course'}{' '}
                tuition of {money(avgRate)} per learner.
                {totalLearners > 0 &&
                  (totalLearners >= breakEvenLearners
                    ? ` Your ${totalLearners} projected learners are ${totalLearners - breakEvenLearners} above break-even.`
                    : ` Your ${totalLearners} projected learners are ${breakEvenLearners - totalLearners} short of break-even.`)}
                {recoverBuildLearners > 0 &&
                  ` To also recover the ${money(phase1)} build investment: ${recoverBuildLearners} learners.`}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-600">
              Fill in tuition and your Course Delivery costs to see how many learners you need to
              break even.
            </p>
          )}
        </div>

        {num(budget.additional_revenue) > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Plus {money(num(budget.additional_revenue))} anticipated additional revenue, not
            included above.
          </p>
        )}

        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloading ? 'Creating budget…' : 'Download budget (Excel) ↓'}
        </button>
        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
