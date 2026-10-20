import { useState } from 'react';
import { Field, TextInput, Textarea } from './Field';
import { downloadBudgetXlsx, humanError } from '../services/api';
import type { BudgetFacultyDirector, BudgetRevenueLine, CourseBudget } from '../types/proposal';

// Rates from the Thrive Academy Course Budget Worksheet.
const FRINGE_RATE = 0.37;
const INFRASTRUCTURE_RATE = 0.3;
const ADMIN_SUPPORT_RATE = 0.15;
const MAX_FACULTY = 4;

interface Props {
  courseTitle: string;
  tuition: string;
  budget: CourseBudget;
  onChange: (budget: CourseBudget) => void;
}

// Pull a number out of free text like "$1,200", "12", "1.5".
function num(v: string): number {
  const m = (v || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function money(n: number): string {
  const rounded = Math.round(n);
  const s = `$${Math.abs(rounded).toLocaleString('en-US')}`;
  return rounded < 0 ? `(${s})` : s;
}

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

export default function BudgetBuilder({ courseTitle, tuition, budget, onChange }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tuitionUsd = num(tuition);

  // A blank per-learner rate means "use the course tuition".
  const rateFor = (line: BudgetRevenueLine) => (line.rate.trim() ? num(line.rate) : tuitionUsd);
  const revenueFor = (line: BudgetRevenueLine) => num(line.learners) * rateFor(line);

  const revenue = REVENUE_LINES.reduce((sum, l) => sum + revenueFor(budget[l.key]), 0);
  const salaries = budget.faculty_directors.reduce((sum, fd) => sum + num(fd.allocation), 0);
  const fringe = salaries * FRINGE_RATE;
  const guests = num(budget.guest_speakers_count) * num(budget.guest_speaker_rate);
  const additional = num(budget.additional_expenses);
  const subtotal = salaries + fringe + guests + additional;
  const infrastructure = revenue * INFRASTRUCTURE_RATE;
  const admin = revenue * ADMIN_SUPPORT_RATE;
  const totalExpenses = subtotal + infrastructure + admin;
  const balance = revenue - totalExpenses;
  const margin = revenue ? balance / revenue : 0;

  const set = (patch: Partial<CourseBudget>) => onChange({ ...budget, ...patch });
  const setLine = (key: RevenueKey, patch: Partial<BudgetRevenueLine>) =>
    set({ [key]: { ...budget[key], ...patch } } as Partial<CourseBudget>);
  const setFaculty = (i: number, patch: Partial<BudgetFacultyDirector>) =>
    set({
      faculty_directors: budget.faculty_directors.map((fd, j) => (j === i ? { ...fd, ...patch } : fd)),
    });

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const line = (l: BudgetRevenueLine) => ({
        learners: num(l.learners),
        rate: rateFor(l),
        notes: l.notes,
      });
      const blob = await downloadBudgetXlsx({
        course_title: courseTitle,
        employer_sponsored: line(budget.employer_sponsored),
        self_pay: line(budget.self_pay),
        scholarship: line(budget.scholarship),
        additional_revenue: num(budget.additional_revenue),
        additional_revenue_notes: budget.additional_revenue_notes,
        faculty_directors: budget.faculty_directors.map((fd) => ({
          name: fd.name,
          engagement_period: fd.engagement_period,
          allocation: num(fd.allocation),
        })),
        faculty_sharing_notes: budget.faculty_sharing_notes,
        guest_speakers_count: num(budget.guest_speakers_count),
        guest_speaker_rate: num(budget.guest_speaker_rate),
        guest_speaker_notes: budget.guest_speaker_notes,
        additional_expenses: additional,
        additional_expenses_notes: budget.additional_expenses_notes,
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

  return (
    <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Course budget
      </div>
      <h3 className="text-lg font-bold text-slate-900">Build your course budget</h3>
      <p className="mt-1 mb-5 text-sm text-slate-600">
        Answer the questions below to fill in the Thrive Academy Course Budget Worksheet. Each
        course has $10,000 for the Course Building Phase; the Course Delivery Phase budget is
        calculated by the management team based on course format and complexity.
      </p>

      <div className="mb-2 text-sm font-semibold text-slate-800">1. Revenue</div>
      <p className="mb-3 text-xs text-slate-500">
        Tuition per learner is {tuitionUsd ? <strong>{money(tuitionUsd)}</strong> : 'set by the pricing formula above'}
        . Change the rate on a line only if those learners pay a different amount.
      </p>
      {REVENUE_LINES.map(({ key, label, question }) => (
        <div key={key} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-sm font-medium text-slate-900">{label}</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Learners" hint={question}>
              <TextInput
                value={budget[key].learners}
                onChange={(v) => setLine(key, { learners: v })}
                placeholder="e.g. 10"
              />
            </Field>
            <Field label="Tuition per learner" hint="Leave blank to use the course tuition.">
              <TextInput
                value={budget[key].rate}
                onChange={(v) => setLine(key, { rate: v })}
                placeholder={tuitionUsd ? money(tuitionUsd) : '$'}
              />
            </Field>
            <Field label="Notes / assumptions">
              <TextInput value={budget[key].notes} onChange={(v) => setLine(key, { notes: v })} />
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

      <div className="mb-2 mt-2 text-sm font-semibold text-slate-800">2. Faculty directors</div>
      <p className="mb-3 text-xs text-slate-500">
        Who is teaching, over what timeframe, and what is each person's allocation? Fringe is added
        automatically at the 37% Georgetown rate.
      </p>
      {budget.faculty_directors.map((fd, i) => (
        <div key={i} className="mb-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <Field label="Faculty director">
            <TextInput value={fd.name} onChange={(v) => setFaculty(i, { name: v })} placeholder="Name" />
          </Field>
          <Field label="Engagement period">
            <TextInput
              value={fd.engagement_period}
              onChange={(v) => setFaculty(i, { engagement_period: v })}
              placeholder="e.g. Jan-May 2027"
            />
          </Field>
          <Field label="Allocation">
            <TextInput
              value={fd.allocation}
              onChange={(v) => setFaculty(i, { allocation: v })}
              placeholder="e.g. $8,000"
            />
          </Field>
          <div className="mb-6 pb-2 text-xs text-slate-500">
            + {money(num(fd.allocation) * FRINGE_RATE)} fringe
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
                { name: '', engagement_period: '', allocation: '' },
              ],
            })
          }
          className="mb-4 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-400"
        >
          + Add another faculty director
        </button>
      )}
      <Field label="How is teaching time shared among faculty?">
        <Textarea
          value={budget.faculty_sharing_notes}
          onChange={(v) => set({ faculty_sharing_notes: v })}
          rows={2}
        />
      </Field>

      <div className="mb-2 text-sm font-semibold text-slate-800">3. Course &amp; instructional costs</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Guest lecturers" hint="How many community speakers or guest lecturers? (if any)">
          <TextInput
            value={budget.guest_speakers_count}
            onChange={(v) => set({ guest_speakers_count: v })}
            placeholder="e.g. 3"
          />
        </Field>
        <Field label="Honorarium per guest">
          <TextInput
            value={budget.guest_speaker_rate}
            onChange={(v) => set({ guest_speaker_rate: v })}
            placeholder="e.g. $500"
          />
        </Field>
        <Field label="Notes">
          <TextInput
            value={budget.guest_speaker_notes}
            onChange={(v) => set({ guest_speaker_notes: v })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Additional course development or instructional expenses"
          hint="Instructional design help, technology, materials, or other agreed needs."
        >
          <TextInput
            value={budget.additional_expenses}
            onChange={(v) => set({ additional_expenses: v })}
            placeholder="e.g. $2,000"
          />
        </Field>
        <Field label="What is it for?">
          <TextInput
            value={budget.additional_expenses_notes}
            onChange={(v) => set({ additional_expenses_notes: v })}
          />
        </Field>
      </div>

      <div className="rounded-xl border border-emerald-300 bg-white p-5 text-sm">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Budget summary
        </div>
        {row('Current projected revenue', revenue, true)}
        <div className="my-2 border-t border-slate-100" />
        {row('Faculty director salaries', salaries)}
        {row('Fringe benefits (37%)', fringe)}
        {row('Community speakers / guest lecturers', guests)}
        {row('Additional development / instructional expenses', additional)}
        {row('Expense subtotal (faculty + instruction)', subtotal, true)}
        {row('THRIVE infrastructure (30% of revenue)', infrastructure)}
        {row('Administrative support (15% of revenue)', admin)}
        {row('Total projected expenses', totalExpenses, true)}
        <div className="my-2 border-t border-slate-100" />
        {row('Projected operating balance', balance, true)}
        <div className="flex justify-between py-1 text-slate-700">
          <span>Operating margin</span>
          <span>{(margin * 100).toFixed(1)}%</span>
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
