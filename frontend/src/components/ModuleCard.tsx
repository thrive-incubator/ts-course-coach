import { useMemo, useRef, useState } from 'react';
import {
  BLOOM_LEVELS,
  INTERACTIVE_FEATURES,
  newMaterialId,
  type BloomLevel,
  type CourseModule,
  type ModuleMaterial,
  type ModuleObjective,
} from '../types/proposal';
import {
  humanError,
  reviewMaterial,
  reviewModule,
  type ModuleReview,
  type SiblingModule,
} from '../services/api';
import { Field, TextInput, Textarea } from './Field';

const BLOOM_COLORS: Record<BloomLevel, string> = {
  Remember: 'bg-slate-100 text-slate-700 border-slate-200',
  Understand: 'bg-sky-100 text-sky-800 border-sky-200',
  Apply: 'bg-teal-100 text-teal-800 border-teal-200',
  Analyze: 'bg-amber-100 text-amber-900 border-amber-200',
  Evaluate: 'bg-orange-100 text-orange-900 border-orange-200',
  Create: 'bg-violet-100 text-violet-900 border-violet-200',
};

const ACCEPT_EXT = '.pdf,.pptx,.docx,.txt,.md';

interface Props {
  index: number;
  module: CourseModule;
  courseEssentialQuestion: string;
  courseContext: Record<string, string>;
  courseLearningObjectives?: string;
  siblingModules?: SiblingModule[];
  onChange: (patch: Partial<CourseModule>) => void;
  /**
   * Functional materials update — reads the latest list, so concurrent uploads/removals
   * aren't lost. Optional only so legacy callers (Wizard) still compile; falls back to a
   * snapshot-based onChange when absent.
   */
  onPatchMaterials?: (fn: (prev: ModuleMaterial[]) => ModuleMaterial[]) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Export this module as a PDF (opens the print dialog in a new tab). Optional so legacy callers still compile. */
  onExportPdf?: () => void;
}

export default function ModuleCard({
  index,
  module,
  courseEssentialQuestion,
  courseContext,
  courseLearningObjectives = '',
  siblingModules = [],
  onChange,
  onPatchMaterials,
  onRemove,
  onMoveUp,
  onMoveDown,
  onExportPdf,
}: Props) {
  const [open, setOpen] = useState(index === 0);
  const [review, setReview] = useState<ModuleReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploading = module.materials.some((m) => m.status === 'reviewing');

  const patchMaterials = (fn: (prev: ModuleMaterial[]) => ModuleMaterial[]) => {
    if (onPatchMaterials) onPatchMaterials(fn);
    else onChange({ materials: fn(module.materials) });
  };

  const filledCount = useMemo(() => {
    let c = 0;
    if (module.essential_question.trim()) c++;
    if (module.objectives.some((o) => o.text.trim())) c++;
    if (module.critical_information.trim()) c++;
    if (module.engagement_opportunities.trim()) c++;
    if (module.interactive_features.length > 0) c++;
    if (module.materials.length > 0) c++;
    return c;
  }, [module]);

  function addObjective() {
    onChange({ objectives: [...module.objectives, { text: '', bloom: '' }] });
  }
  function updateObjective(i: number, patch: Partial<ModuleObjective>) {
    const next = module.objectives.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ objectives: next });
  }
  function removeObjective(i: number) {
    onChange({ objectives: module.objectives.filter((_, j) => j !== i) });
  }

  function toggleFeature(f: string) {
    const has = module.interactive_features.includes(f);
    onChange({
      interactive_features: has
        ? module.interactive_features.filter((x) => x !== f)
        : [...module.interactive_features, f],
    });
  }

  async function fetchReview() {
    setReviewing(true);
    setReviewError(null);
    try {
      const r = await reviewModule({
        module,
        course_essential_question: courseEssentialQuestion,
        course_context: courseContext,
        course_learning_objectives: courseLearningObjectives,
        sibling_modules: siblingModules,
      });
      setReview(r);
    } catch (e) {
      setReviewError(humanError(e, 'Could not reach the coach.'));
    } finally {
      setReviewing(false);
    }
  }

  async function handleFile(file: File) {
    const mat: ModuleMaterial = {
      id: newMaterialId(),
      filename: file.name,
      uploaded_at: new Date().toISOString(),
      feedback: '',
      status: 'reviewing',
    };
    patchMaterials((prev) => [...prev, mat]);
    try {
      const res = await reviewMaterial({
        file,
        module,
        course_essential_question: courseEssentialQuestion,
        course_context: courseContext,
      });
      const feedback =
        `**Summary.** ${res.summary}\n\n` +
        (res.strengths.length ? `**Strengths.**\n- ${res.strengths.join('\n- ')}\n\n` : '') +
        (res.improvements.length
          ? `**Suggested improvements.**\n- ${res.improvements.join('\n- ')}\n\n`
          : '') +
        (res.bloom_diagnosis ? `**Bloom's read.** ${res.bloom_diagnosis}\n\n` : '') +
        (res.engagement_ideas.length
          ? `**Engagement ideas.**\n- ${res.engagement_ideas.join('\n- ')}\n`
          : '');
      patchMaterials((prev) =>
        prev.map((m) => (m.id === mat.id ? { ...m, feedback, status: 'ready' as const } : m))
      );
    } catch (e) {
      const err = humanError(e, 'upload / review failed');
      patchMaterials((prev) =>
        prev.map((m) =>
          m.id === mat.id ? { ...m, feedback: '', status: 'failed' as const, error: err } : m
        )
      );
    }
  }

  function removeMaterial(id: string) {
    patchMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-t-2xl px-5 py-4 text-left hover:bg-slate-50"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-slate-900">
              {module.module_name || `Module ${index + 1}`}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
              {module.contact_hours && <span>{module.contact_hours}</span>}
              {module.format && <span>· {module.format}</span>}
              <span>· {filledCount}/6 pedagogy dimensions</span>
              {module.materials.length > 0 && (
                <span>· {module.materials.length} material{module.materials.length === 1 ? '' : 's'}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onMoveUp && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onMoveUp();
                }
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Move up"
            >
              ↑
            </span>
          )}
          {onMoveDown && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onMoveDown();
                }
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Move down"
            >
              ↓
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remove module "${module.module_name || `Module ${index + 1}`}"?`)) onRemove();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                if (confirm(`Remove module "${module.module_name || `Module ${index + 1}`}"?`)) onRemove();
              }
            }}
            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Remove module"
          >
            ×
          </span>
          <span className="ml-1 text-slate-400">{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-5">
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Module name">
              <TextInput
                value={module.module_name}
                onChange={(v) => onChange({ module_name: v })}
                placeholder="e.g. Foundations of trauma-informed practice"
              />
            </Field>
            <Field label="Contact hours">
              <TextInput
                value={module.contact_hours}
                onChange={(v) => onChange({ contact_hours: v })}
                placeholder="e.g. 6"
              />
            </Field>
            <Field label="Format">
              <TextInput
                value={module.format}
                onChange={(v) => onChange({ format: v })}
                placeholder="e.g. Live virtual"
              />
            </Field>
          </div>

          <Field
            label="Essential question for this module"
            hint={
              courseEssentialQuestion
                ? `Tie to course essential question: "${courseEssentialQuestion}"`
                : 'A big-picture question this module invites learners to grapple with. Add a course-level essential question above to keep modules aligned.'
            }
          >
            <Textarea
              value={module.essential_question}
              onChange={(v) => onChange({ essential_question: v })}
              placeholder="e.g. How do we recognize the invisible weight our learners bring into every session?"
              rows={2}
            />
          </Field>

          <div className="mb-6">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-900">
                Learning objectives (tied to the module essential question)
              </label>
              <button
                type="button"
                onClick={addObjective}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                + Add objective
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Bloom's Revised Taxonomy — pick the cognitive level, then write with an observable verb.
            </p>
            {module.objectives.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                No objectives yet. Click <span className="font-medium">+ Add objective</span> or hit
                <span className="font-medium"> Coach this module</span> below for a tuned starter set.
              </div>
            )}
            {module.objectives.map((obj, i) => (
              <div key={i} className="mb-2 flex items-start gap-2">
                <select
                  value={obj.bloom}
                  onChange={(e) => updateObjective(i, { bloom: e.target.value as BloomLevel | '' })}
                  className={
                    'shrink-0 rounded-md border px-2 py-1.5 text-xs font-medium ' +
                    (obj.bloom ? BLOOM_COLORS[obj.bloom as BloomLevel] : 'border-slate-200 bg-white text-slate-500')
                  }
                >
                  <option value="">Bloom level…</option>
                  {BLOOM_LEVELS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <input
                  value={obj.text}
                  onChange={(e) => updateObjective(i, { text: e.target.value })}
                  placeholder="Learners will be able to…"
                  className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeObjective(i)}
                  className="shrink-0 rounded px-1 text-slate-400 hover:text-rose-600"
                  aria-label="Remove objective"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <Field
            label="Critical information"
            hint="What must-know content anchors this module — the concepts, frameworks, or facts learners cannot leave without."
          >
            <Textarea
              value={module.critical_information}
              onChange={(v) => onChange({ critical_information: v })}
              rows={4}
              placeholder="Frameworks, key definitions, non-negotiable content…"
            />
          </Field>

          <Field
            label="Opportunities for engagement"
            hint="How learners actively wrestle with the content — discussions, prompts, quick writes, small-group work."
          >
            <Textarea
              value={module.engagement_opportunities}
              onChange={(v) => onChange({ engagement_opportunities: v })}
              rows={4}
              placeholder="e.g. 10-min think-pair-share on the guiding question, then 25-min small-group case unpack…"
            />
          </Field>

          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-slate-900">
              Interactive features
            </label>
            <p className="mb-2 text-xs text-slate-500">
              Which learning modalities live inside this module? Pick any that fit.
            </p>
            <div className="mb-2 flex flex-wrap gap-2">
              {INTERACTIVE_FEATURES.map((f) => {
                const on = module.interactive_features.includes(f);
                return (
                  <button
                    type="button"
                    key={f}
                    onClick={() => toggleFeature(f)}
                    className={
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                      (on
                        ? 'border-violet-500 bg-violet-500 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700')
                    }
                  >
                    {on && '✓ '}
                    {f}
                  </button>
                );
              })}
            </div>
            <Textarea
              value={module.interactive_features_notes}
              onChange={(v) => onChange({ interactive_features_notes: v })}
              rows={3}
              placeholder="Notes on how these show up — e.g. 'Case study is a fictional 4-year-old client file; sim runs in Kognito.'"
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Required readings">
              <Textarea
                value={module.required_readings}
                onChange={(v) => onChange({ required_readings: v })}
                rows={3}
              />
            </Field>
            <Field label="Recommended readings">
              <Textarea
                value={module.recommended_readings}
                onChange={(v) => onChange({ recommended_readings: v })}
                rows={3}
              />
            </Field>
          </div>

          <Field label="Assignments">
            <Textarea
              value={module.assignments}
              onChange={(v) => onChange({ assignments: v })}
              rows={3}
              placeholder="What learners produce — reflections, artifacts, applied briefs…"
            />
          </Field>

          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Upload slides or a lesson plan for coach feedback
                </div>
                <div className="text-xs text-slate-500">
                  PDF, PPTX, DOCX, TXT, MD — the coach reads it and returns pedagogy notes.
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? 'Reviewing…' : 'Upload file'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_EXT}
                disabled={uploading}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
            </div>
            {module.materials.length === 0 && (
              <div className="text-xs text-slate-400">No materials uploaded for this module yet.</div>
            )}
            {module.materials.map((mat) => (
              <div
                key={mat.id}
                className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate font-medium text-slate-800">
                    📄 {mat.filename}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMaterial(mat.id)}
                    className="shrink-0 rounded px-1 text-slate-400 hover:text-rose-600"
                    aria-label="Remove material"
                  >
                    ×
                  </button>
                </div>
                {mat.status === 'reviewing' && (
                  <div className="text-xs text-slate-500">Coach is reading the file…</div>
                )}
                {mat.status === 'failed' && (
                  <div className="text-xs text-rose-700">Couldn't review: {mat.error}</div>
                )}
                {mat.status === 'ready' && mat.feedback && (
                  <MarkdownLite text={mat.feedback} />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={fetchReview}
              disabled={reviewing}
              className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-200 disabled:opacity-50"
            >
              <span aria-hidden>✨</span>
              {reviewing ? 'Coach reading module…' : 'Coach this module'}
            </button>
            {onExportPdf && (
              <button
                type="button"
                onClick={onExportPdf}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                title="Save this module as a PDF you can upload into Articulate"
              >
                <span aria-hidden>📄</span>
                Download module PDF
              </button>
            )}
            {reviewError && <div className="text-xs text-rose-700">{reviewError}</div>}
          </div>

          {review && <ModuleReviewCard review={review} onDismiss={() => setReview(null)} />}
        </div>
      )}
    </div>
  );
}

function ModuleReviewCard({ review, onDismiss }: { review: ModuleReview; onDismiss: () => void }) {
  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold text-violet-900">Coach — full-module review</div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-violet-500 hover:text-violet-700"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      {review.bloom_diagnosis && (
        <p className="mb-2 rounded-md bg-white/70 p-2 text-slate-800">
          <span className="font-semibold">Bloom's read: </span>
          {review.bloom_diagnosis}
        </p>
      )}
      <ReviewList label="Strengths" items={review.strengths} tone="text-emerald-800" />
      <ReviewList label="Gaps" items={review.gaps} tone="text-amber-900" />
      <ReviewList label="Suggestions" items={review.suggestions} tone="text-slate-800" />
      <ReviewList
        label="Interactive-feature ideas to try"
        items={review.interactive_ideas}
        tone="text-slate-800"
      />
    </div>
  );
}

function ReviewList({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">{label}</div>
      <ul className={`mt-1 space-y-1 ${tone}`}>
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-slate-400">•</span>
            <span className="flex-1 whitespace-pre-wrap">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MarkdownLite({ text }: { text: string }) {
  // Very light markdown → JSX. Handles **bold**, - bullets, blank-line paragraphs.
  const blocks = text.split(/\n\s*\n/);
  return (
    <div className="space-y-2 text-sm text-slate-700">
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => l.trim().startsWith('- '))) {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^-\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
