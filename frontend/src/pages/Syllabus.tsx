import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthMenu from '../components/AuthMenu';
import CoachButton from '../components/CoachButton';
import SaveResume from '../components/SaveResume';
import { Field, Select, TextInput, Textarea } from '../components/Field';
import { useProposal } from '../hooks/useProposal';
import {
  emptyAssignment,
  emptyWeek,
  type SyllabusAssignment,
  type SyllabusWeek,
} from '../types/proposal';
import { exportSyllabusPdf } from '../services/pdfExport';

const COURSE_FORMATS = ['In-Person', 'Virtual Sync', 'Async', 'Hybrid', 'Other'];
const GRADING_MODES = ['Letter grade', 'Pass/Fail', 'CEUs only', 'Other'];

export default function Syllabus() {
  const {
    proposal,
    setProposal,
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

  const co = proposal.course_overview;
  const d = proposal.design;
  const s = proposal.syllabus;

  const effectiveDescription = s.description_override || co.course_description;
  const effectiveObjectives = s.objectives_override || d.learning_objectives;
  const hasConceptualization =
    co.course_name.trim().length > 0 ||
    co.intended_audiences.trim().length > 0 ||
    d.essential_question.trim().length > 0 ||
    d.learning_objectives.trim().length > 0;

  const courseContext = useMemo(
    () => ({
      course_name: co.course_name,
      course_type: co.course_type,
      course_format: s.format || co.course_format,
      intended_audiences: co.intended_audiences,
      duration: co.duration,
      course_description: effectiveDescription,
      essential_question: d.essential_question,
      learning_objectives: effectiveObjectives,
    }),
    [co, s.format, effectiveDescription, d.essential_question, effectiveObjectives]
  );

  function patchSyllabus(patch: Partial<typeof s>) {
    updateSection('syllabus', patch);
  }

  function updateWeek(id: string, patch: Partial<SyllabusWeek>) {
    setProposal((prev) => ({
      ...prev,
      syllabus: {
        ...prev.syllabus,
        weeks: prev.syllabus.weeks.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      },
    }));
  }

  function addWeek() {
    setProposal((prev) => ({
      ...prev,
      syllabus: { ...prev.syllabus, weeks: [...prev.syllabus.weeks, emptyWeek()] },
    }));
  }

  function removeWeek(id: string) {
    setProposal((prev) => ({
      ...prev,
      syllabus: {
        ...prev.syllabus,
        weeks: prev.syllabus.weeks.filter((w) => w.id !== id),
      },
    }));
  }

  function seedWeeksFromModules() {
    const weeks = d.modules.map((m, i) => ({
      ...emptyWeek(),
      week_label: `Week ${i + 1}`,
      module_ref: m.module_name || `Module ${i + 1}`,
      topic: m.module_name || '',
      readings: m.required_readings || '',
      activities: m.critical_information || '',
      assignment_due: m.assignments || '',
    }));
    setProposal((prev) => ({ ...prev, syllabus: { ...prev.syllabus, weeks } }));
  }

  function updateAssignment(id: string, patch: Partial<SyllabusAssignment>) {
    setProposal((prev) => ({
      ...prev,
      syllabus: {
        ...prev.syllabus,
        assignments: prev.syllabus.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      },
    }));
  }

  function addAssignment() {
    setProposal((prev) => ({
      ...prev,
      syllabus: { ...prev.syllabus, assignments: [...prev.syllabus.assignments, emptyAssignment()] },
    }));
  }

  function removeAssignment(id: string) {
    setProposal((prev) => ({
      ...prev,
      syllabus: {
        ...prev.syllabus,
        assignments: prev.syllabus.assignments.filter((a) => a.id !== id),
      },
    }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Thrive Academy · Syllabus
            </div>
            <h1 className="text-xl font-bold text-slate-900">Syllabus builder</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              ← Home
            </button>
            <button
              type="button"
              onClick={() => navigate('/pedagogy')}
              className="rounded-lg bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              <span aria-hidden className="mr-1">🎓</span>
              Course design →
            </button>
            <AuthMenu
              onLoadProposal={(id) => {
                const u = new URL(window.location.href);
                u.searchParams.set('id', id);
                u.pathname = '/';
                u.hash = '';
                window.location.assign(u.toString());
              }}
            />
            <SaveResume
              remoteId={remoteId}
              remoteStatus={remoteStatus}
              onPublish={publishRemote}
              onNew={startNew}
            />
          </div>
        </div>
      </header>

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

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
          <div className="text-sm font-semibold text-sky-900">
            {hasConceptualization
              ? '✨ Pulling from your course design'
              : 'No course design on file yet'}
          </div>
          <p className="mt-1 text-xs text-slate-700">
            {hasConceptualization
              ? "The syllabus is auto-filling from the course basics and pedagogy workspace you've already built. Edits here override the pull without changing your course design."
              : "You can build a syllabus straight from here — but you'll get stronger auto-fills if you spend 5 minutes in the course design workspace first (course basics, essential question, learning objectives, module list)."}
            {!hasConceptualization && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={() => navigate('/pedagogy')}
                  className="underline hover:text-sky-800"
                >
                  Open course design →
                </button>
              </>
            )}
          </p>
        </div>

        {/* Section 1 — Setup */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            Section 1 · Setup
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-900">Course + instructor basics</h2>
          <p className="mb-6 text-sm text-slate-500">
            The things no AI can guess — course number, your contact info, dates, format,
            credit hours.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Course title" hint="Pulled from course basics">
              <TextInput
                value={co.course_name}
                onChange={(v) => updateSection('course_overview', { course_name: v })}
                placeholder="Working title"
              />
            </Field>
            <Field label="Course number" hint="Registrar-assigned">
              <TextInput
                value={s.course_number}
                onChange={(v) => patchSyllabus({ course_number: v })}
                placeholder="e.g. IECMH-501"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Instructor name">
              <TextInput
                value={s.instructor_name || co.faculty}
                onChange={(v) => patchSyllabus({ instructor_name: v })}
                placeholder="Lead instructor"
              />
            </Field>
            <Field label="Credentials / title">
              <TextInput
                value={s.instructor_credentials}
                onChange={(v) => patchSyllabus({ instructor_credentials: v })}
                placeholder="e.g. PhD, LCSW-C, Associate Professor"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Instructor email">
              <TextInput
                type="email"
                value={s.instructor_email}
                onChange={(v) => patchSyllabus({ instructor_email: v })}
                placeholder="name@example.org"
              />
            </Field>
            <Field label="Phone (optional)">
              <TextInput
                value={s.instructor_phone}
                onChange={(v) => patchSyllabus({ instructor_phone: v })}
                placeholder="Office / cell"
              />
            </Field>
          </div>

          <Field label="Office hours" hint="When + how (in-person / Zoom link / by appt)">
            <Textarea
              value={s.office_hours}
              onChange={(v) => patchSyllabus({ office_hours: v })}
              placeholder="e.g. Wednesdays 3–4pm ET on Zoom, or by appointment"
              rows={2}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Semester / term">
              <TextInput
                value={s.semester}
                onChange={(v) => patchSyllabus({ semester: v })}
                placeholder="e.g. Fall 2026"
              />
            </Field>
            <Field label="Start date">
              <TextInput
                type="date"
                value={s.start_date}
                onChange={(v) => patchSyllabus({ start_date: v })}
              />
            </Field>
            <Field label="End date">
              <TextInput
                type="date"
                value={s.end_date}
                onChange={(v) => patchSyllabus({ end_date: v })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Format">
              <Select
                value={s.format || co.course_format}
                onChange={(v) => patchSyllabus({ format: v })}
                options={COURSE_FORMATS}
              />
            </Field>
            <Field label="Location (or 'Varies')">
              <TextInput
                value={s.location}
                onChange={(v) => patchSyllabus({ location: v })}
                placeholder="e.g. Online · Zoom link in LMS"
              />
            </Field>
          </div>

          <Field label="Meeting days + times" hint="Only if there are live sessions">
            <TextInput
              value={s.meeting_days_times}
              onChange={(v) => patchSyllabus({ meeting_days_times: v })}
              placeholder="e.g. Tuesdays 7–9pm ET, Jan 14 – Apr 29"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Credit hours">
              <TextInput
                value={s.credit_hours}
                onChange={(v) => patchSyllabus({ credit_hours: v })}
                placeholder="e.g. 3"
              />
            </Field>
            <Field label="CEUs" hint="10 contact hrs = 1 CEU">
              <TextInput
                value={s.ceus}
                onChange={(v) => patchSyllabus({ ceus: v })}
                placeholder="e.g. 3.0"
              />
            </Field>
            <Field label="Grading mode">
              <Select
                value={s.grading_mode}
                onChange={(v) => patchSyllabus({ grading_mode: v })}
                options={GRADING_MODES}
              />
            </Field>
          </div>

          <Field
            label="Weekly time students should budget"
            hint="Total — class time + reading + assignments"
          >
            <TextInput
              value={s.weekly_time_budget}
              onChange={(v) => patchSyllabus({ weekly_time_budget: v })}
              placeholder="e.g. 6–8 hours per week"
            />
          </Field>
        </section>

        {/* Section 1b — Course description + objectives (auto-pulled) */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            Course description + objectives
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-900">
            {hasConceptualization ? 'Pulled from your course design — edit if needed' : 'Fill these in'}
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            These flow from the course basics + pedagogy workspace. Overrides stay on the syllabus
            only; they don't rewrite your course design.
          </p>

          <Field
            label="Course description"
            hint={
              s.description_override
                ? 'Override active — clear this field to revert to course basics'
                : 'Showing course basics; edit to override for the syllabus'
            }
          >
            <Textarea
              value={effectiveDescription}
              onChange={(v) => patchSyllabus({ description_override: v })}
              placeholder="A paragraph on what this course is and who it serves."
              rows={4}
            />
          </Field>

          <Field
            label="Learning objectives"
            hint={
              s.objectives_override
                ? 'Override active — clear to revert'
                : 'Pulled from pedagogy workspace'
            }
          >
            <Textarea
              value={effectiveObjectives}
              onChange={(v) => patchSyllabus({ objectives_override: v })}
              placeholder="One per line — observable Bloom's verbs."
              rows={5}
            />
          </Field>

          <Field
            label="Knowledge + skills table"
            hint="What learners will know (concepts) and what they'll be able to do (skills). One per line."
            coach={
              <CoachButton
                section="syllabus"
                field="knowledge_skills"
                fieldLabel="Knowledge + skills"
                currentValue={s.knowledge_skills}
                courseContext={courseContext}
                onApplyExample={(v) =>
                  patchSyllabus({
                    knowledge_skills: s.knowledge_skills ? s.knowledge_skills + '\n' + v : v,
                  })
                }
              />
            }
          >
            <Textarea
              value={s.knowledge_skills}
              onChange={(v) => patchSyllabus({ knowledge_skills: v })}
              placeholder="Knowledge: trauma-informed supervision frameworks&#10;Skill: facilitate a reflective supervision session with a home visitor"
              rows={5}
            />
          </Field>
        </section>

        {/* Section 2 — Schedule builder */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                Section 2 · Schedule
              </div>
              <h3 className="text-xl font-bold text-slate-900">Week-by-week plan</h3>
              <p className="mt-1 text-sm text-slate-500">
                One row per week. Pull topics + readings + assignments from your modules, or
                start fresh.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {d.modules.length > 0 && s.weeks.length === 0 && (
                <button
                  type="button"
                  onClick={seedWeeksFromModules}
                  className="rounded-lg bg-violet-100 px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-200"
                >
                  Seed from {d.modules.length} modules
                </button>
              )}
              <button
                type="button"
                onClick={addWeek}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
              >
                + Add week
              </button>
            </div>
          </div>

          <Field label="Required texts / readings">
            <Textarea
              value={s.required_texts}
              onChange={(v) => patchSyllabus({ required_texts: v })}
              placeholder="Books, articles, platforms learners must access."
              rows={3}
            />
          </Field>
          <Field label="Recommended texts">
            <Textarea
              value={s.recommended_texts}
              onChange={(v) => patchSyllabus({ recommended_texts: v })}
              placeholder="Optional / supplementary."
              rows={2}
            />
          </Field>
          <Field label="Technology requirements">
            <Textarea
              value={s.technology_requirements || d.technology_needs}
              onChange={(v) => patchSyllabus({ technology_requirements: v })}
              placeholder="LMS, Zoom, mic/camera, submission platform, etc."
              rows={2}
            />
          </Field>

          {s.weeks.length === 0 && (
            <div className="my-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div className="text-sm text-slate-600">
                No weeks yet. Add one — or seed from your modules if you've already built them.
              </div>
            </div>
          )}

          {s.weeks.map((w, i) => (
            <div
              key={w.id}
              className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={`Week ${i + 1} label`}>
                    <TextInput
                      value={w.week_label}
                      onChange={(v) => updateWeek(w.id, { week_label: v })}
                      placeholder={`Week ${i + 1}`}
                    />
                  </Field>
                  <Field label="Dates">
                    <TextInput
                      value={w.date_range}
                      onChange={(v) => updateWeek(w.id, { date_range: v })}
                      placeholder="e.g. Jan 14 – 20"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => removeWeek(w.id)}
                  className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              <Field label="Topic / module">
                <TextInput
                  value={w.topic}
                  onChange={(v) => updateWeek(w.id, { topic: v })}
                  placeholder="What this week is about"
                />
              </Field>
              <Field label="Readings for this week">
                <Textarea
                  value={w.readings}
                  onChange={(v) => updateWeek(w.id, { readings: v })}
                  rows={2}
                />
              </Field>
              <Field label="Activities / in-class work">
                <Textarea
                  value={w.activities}
                  onChange={(v) => updateWeek(w.id, { activities: v })}
                  rows={2}
                />
              </Field>
              <Field label="Assignments due">
                <TextInput
                  value={w.assignment_due}
                  onChange={(v) => updateWeek(w.id, { assignment_due: v })}
                  placeholder="e.g. Reflection #2 due Sunday 11:59pm"
                />
              </Field>
            </div>
          ))}

          {s.weeks.length > 0 && (
            <button
              type="button"
              onClick={addWeek}
              className="mb-2 mt-4 w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
            >
              + Add another week
            </button>
          )}
        </section>

        {/* Section 2b — Assignments table */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-3 flex items-end justify-between border-b border-slate-200 pb-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                Assignments + grading
              </div>
              <h3 className="text-xl font-bold text-slate-900">What learners produce</h3>
              <p className="mt-1 text-sm text-slate-500">
                Each major assignment: what it is, when it's due, what it's worth.
              </p>
            </div>
            <button
              type="button"
              onClick={addAssignment}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              + Add assignment
            </button>
          </div>

          {s.assignments.length === 0 && (
            <div className="my-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
              No assignments listed yet.
            </div>
          )}

          {s.assignments.map((a) => (
            <div key={a.id} className="mb-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <Field label="Name">
                  <TextInput
                    value={a.name}
                    onChange={(v) => updateAssignment(a.id, { name: v })}
                    placeholder="e.g. Reflective supervision case write-up"
                  />
                </Field>
                <Field label="Due">
                  <TextInput
                    value={a.due_date}
                    onChange={(v) => updateAssignment(a.id, { due_date: v })}
                    placeholder="e.g. Week 6"
                  />
                </Field>
                <Field label="% of grade">
                  <TextInput
                    value={a.weight}
                    onChange={(v) => updateAssignment(a.id, { weight: v })}
                    placeholder="e.g. 25%"
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeAssignment(a.id)}
                    className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <Field label="Description">
                <Textarea
                  value={a.description}
                  onChange={(v) => updateAssignment(a.id, { description: v })}
                  placeholder="What learners submit, what counts as success."
                  rows={2}
                />
              </Field>
            </div>
          ))}

          <Field
            label="Grading breakdown"
            hint="Narrative version of how the grade adds up (free text)."
          >
            <Textarea
              value={s.grading_breakdown}
              onChange={(v) => patchSyllabus({ grading_breakdown: v })}
              placeholder="e.g. Participation 20%, weekly reflections 30%, case write-up 25%, final project 25%."
              rows={3}
            />
          </Field>
        </section>

        {/* Section 3 — Policies */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            Section 3 · Policies &amp; boilerplate
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-900">The required stuff</h2>
          <p className="mb-6 text-sm text-slate-500">
            Pre-filled with Thrive Academy's standard language. Edit only if your program needs
            different wording.
          </p>

          <Field label="Late-work policy">
            <Textarea
              value={s.late_work_policy}
              onChange={(v) => patchSyllabus({ late_work_policy: v })}
              placeholder="e.g. 10% off per day late up to one week; after that, no credit without prior arrangement."
              rows={3}
            />
          </Field>

          <Field label="Attendance policy">
            <Textarea
              value={s.attendance_policy}
              onChange={(v) => patchSyllabus({ attendance_policy: v })}
              placeholder="e.g. Learners may miss up to one live session; make-up work required."
              rows={3}
            />
          </Field>

          <Field label="Academic integrity">
            <Textarea
              value={s.academic_integrity_policy}
              onChange={(v) => patchSyllabus({ academic_integrity_policy: v })}
              rows={4}
            />
          </Field>

          <Field label="ADA / disability accommodations">
            <Textarea
              value={s.ada_statement}
              onChange={(v) => patchSyllabus({ ada_statement: v })}
              rows={3}
            />
          </Field>

          <Field label="Title IX">
            <Textarea
              value={s.title_ix_statement}
              onChange={(v) => patchSyllabus({ title_ix_statement: v })}
              rows={3}
            />
          </Field>

          <Field label="Anti-discrimination">
            <Textarea
              value={s.anti_discrimination_statement}
              onChange={(v) => patchSyllabus({ anti_discrimination_statement: v })}
              rows={3}
            />
          </Field>

          <Field label="Student support">
            <Textarea
              value={s.student_support_statement}
              onChange={(v) => patchSyllabus({ student_support_statement: v })}
              rows={3}
            />
          </Field>

          <Field label="Netiquette / community agreements">
            <Textarea
              value={s.netiquette_statement}
              onChange={(v) => patchSyllabus({ netiquette_statement: v })}
              rows={3}
            />
          </Field>

          <Field label="Anything else" hint="Program-specific policies or notes.">
            <Textarea
              value={s.additional_policies}
              onChange={(v) => patchSyllabus({ additional_policies: v })}
              rows={3}
            />
          </Field>
        </section>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-sky-900">Export the syllabus</h3>
          <p className="mb-4 text-sm text-slate-700">
            One-click PDF to share with your program lead or upload into Articulate / your LMS.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => exportSyllabusPdf(proposal)}
              className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              📄 Download syllabus PDF
            </button>
            <button
              type="button"
              onClick={() => navigate('/pedagogy')}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ← Back to course design
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
