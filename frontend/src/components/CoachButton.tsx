import { useState } from 'react';
import { getCoachSuggestion, humanError, type CoachResponse } from '../services/api';

const TONE_STYLES: Record<CoachResponse['tone'], string> = {
  encouraging: 'bg-slate-100 text-slate-700 border-slate-200',
  challenging: 'bg-amber-100 text-amber-900 border-amber-200',
  celebratory: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const MIN_DRAFT_CHARS = 40;

interface Props {
  section: string;
  field: string;
  fieldLabel: string;
  currentValue: string;
  courseContext: Record<string, string>;
  onApplyExample?: (text: string) => void;
}

interface Turn {
  role: 'coach' | 'faculty';
  text: string;
  examples?: string[];
  tone?: CoachResponse['tone'];
}

export default function CoachButton({
  section,
  field,
  fieldLabel,
  currentValue,
  courseContext,
  onApplyExample,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [followUp, setFollowUp] = useState('');

  const draftLength = currentValue.trim().length;
  const draftReady = draftLength >= MIN_DRAFT_CHARS;

  async function askCoach(followUpText?: string) {
    setLoading(true);
    setError(null);
    setOpen(true);
    const priorCoachTurn = [...turns].reverse().find((t) => t.role === 'coach');
    try {
      const res = await getCoachSuggestion({
        section,
        field,
        current_value: currentValue,
        course_context: courseContext,
        prior_response: priorCoachTurn?.text || '',
        follow_up: followUpText || '',
      });
      setTurns((prev) => {
        const next: Turn[] = [...prev];
        if (followUpText) {
          next.push({ role: 'faculty', text: followUpText });
        }
        next.push({
          role: 'coach',
          text: res.suggestion,
          examples: res.examples,
          tone: res.tone,
        });
        return next;
      });
      setFollowUp('');
    } catch (e) {
      setError(humanError(e, 'Could not reach the coach.'));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setTurns([]);
    setFollowUp('');
    setError(null);
    setOpen(false);
  }

  const latestCoach = [...turns].reverse().find((t) => t.role === 'coach');
  const latestExamples = latestCoach?.examples || [];

  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => askCoach()}
          disabled={loading || !draftReady}
          title={
            draftReady
              ? undefined
              : 'Write your first thoughts here — the Coach engages once you have a draft to react to.'
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <span aria-hidden>💬</span>
          {loading
            ? 'Coach thinking…'
            : turns.length
              ? 'Ask another sharpening question'
              : 'Talk with the Coach'}
        </button>
        {!draftReady && (
          <span className="text-[11px] italic text-slate-500">
            The Coach engages once you have a first draft to react to.
          </span>
        )}
      </div>

      {open && (turns.length > 0 || error || loading) && (
        <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold text-violet-900">
              Coach — {fieldLabel}
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-violet-500 hover:text-violet-700"
              aria-label="Close conversation"
            >
              ×
            </button>
          </div>

          {loading && turns.length === 0 && (
            <div className="text-violet-700">Reading what you wrote…</div>
          )}

          {error && (
            <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-700">
              {error}
            </div>
          )}

          {turns.map((turn, i) =>
            turn.role === 'coach' ? (
              <div key={i} className="mb-3">
                {turn.tone && (
                  <span
                    className={
                      'mb-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
                      (TONE_STYLES[turn.tone] || TONE_STYLES.encouraging)
                    }
                  >
                    {turn.tone}
                  </span>
                )}
                <p className="whitespace-pre-wrap text-slate-800">{turn.text}</p>
              </div>
            ) : (
              <div
                key={i}
                className="mb-3 rounded-lg border border-violet-200 bg-white p-2 text-slate-700"
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                  You said
                </div>
                <p className="whitespace-pre-wrap">{turn.text}</p>
              </div>
            )
          )}

          {latestExamples.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                Refined versions the Coach drafted for you
              </div>
              {latestExamples.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-white p-3 text-slate-700 shadow-sm"
                >
                  <span className="flex-1 whitespace-pre-wrap">{ex}</span>
                  {onApplyExample && (
                    <button
                      type="button"
                      onClick={() => onApplyExample(ex)}
                      className="shrink-0 rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-700"
                    >
                      Use
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {turns.length > 0 && !loading && (
            <div className="mt-4 border-t border-violet-200 pt-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-violet-700">
                Reply to the Coach
              </label>
              <textarea
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    (e.metaKey || e.ctrlKey) &&
                    e.key === 'Enter' &&
                    followUp.trim().length > 0
                  ) {
                    void askCoach(followUp.trim());
                  }
                }}
                placeholder="Answer the question, push back, or tell the Coach what to sharpen…"
                rows={2}
                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-400"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">⌘⏎ to send</span>
                <button
                  type="button"
                  disabled={followUp.trim().length === 0}
                  onClick={() => askCoach(followUp.trim())}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  Send to Coach
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
