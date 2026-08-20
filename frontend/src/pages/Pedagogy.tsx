import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CoachButton from '../components/CoachButton';
import ModuleCard from '../components/ModuleCard';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { Field, Select, TextInput, Textarea } from '../components/Field';
import { useProposal } from '../hooks/useProposal';
import { emptyModule } from '../types/proposal';

const COURSE_TYPES = [
  'Year-Long Certificate',
  'Semester-Long Certificate',
  'Mini-Course',
  'Microlearning',
  'Other',
];
const COURSE_FORMATS = ['In-Person', 'Virtual Sync', 'Async', 'Other'];

export default function Pedagogy() {
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

  function moveModule(from: number, to: number) {
    if (to < 0 || to >= proposal.design.modules.length) return;
    const modules = proposal.design.modules.slice();
    const [m] = modules.splice(from, 1);
    modules.splice(to, 0, m);
    setProposal((prev) => ({ ...prev, design: { ...prev.design, modules } }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceHeader
        title="Course design & pedagogy workspace"
        subtitle="Pedagogy"
        accent="pedagogy"
        switchTo="marketing"
        remoteId={remoteId}
        remoteStatus={remoteStatus}
        onPublish={publishRemote}
      />

      {loadingRemote && (
        <div className="bg-emerald-50 py-2 text-center text-xs text-emerald-800">
          Loading your saved work…
        </div>
      )}

      <main className="mx-auto max-w-5xl px-6 py-8">
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
          <Field label="Faculty">
            <TextInput
              value={proposal.course_overview.faculty}
              onChange={(v) => updateSection('course_overview', { faculty: v })}
              placeholder="Lead + any co-instructors"
            />
          </Field>
        </section>

        {/* Course-level design */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
            Section 1
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-900">Course-level design</h2>
          <p className="mb-6 text-sm text-slate-500">
            Start with the guiding thread — every module ladders back to it.
          </p>

          <div className="mb-8 rounded-xl border border-violet-200 bg-violet-50/40 p-5">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
              Start here — the guiding thread
            </div>
            <Field
              label="Course essential question"
              hint="The one big question the whole course helps learners grapple with."
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
        </section>

        {/* Modules */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-3 flex items-end justify-between border-b border-slate-200 pb-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                Section 2 · Modules
              </div>
              <h3 className="text-xl font-bold text-slate-900">
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
              className="mb-2 mt-4 w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700"
            >
              + Add another module
            </button>
          )}
        </section>

        {/* Assessment & support */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
            Section 3
          </div>
          <h2 className="mb-1 text-xl font-bold text-slate-900">
            Assessment, support &amp; continuous improvement
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            How you'll know it worked, and how you'll keep it fresh.
          </p>

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
        </section>

        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-violet-900">
            Ready to preview or shift into marketing?
          </h3>
          <p className="mb-4 text-sm text-slate-700">
            The pedagogy is only half the story — pair it with the audience, pricing, and enrollment
            side to give Frances / Anna a complete package.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/marketing')}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              📣 Go to marketing &amp; pricing →
            </button>
            <button
              type="button"
              onClick={() => navigate('/preview')}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Preview full proposal
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
