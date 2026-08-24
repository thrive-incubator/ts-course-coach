import { useState } from 'react';
import { getCoachSuggestion, humanError, type CoachResponse } from '../services/api';

const TONE_STYLES: Record<CoachResponse['tone'], string> = {
  encouraging: 'bg-slate-100 text-slate-700 border-slate-200',
  challenging: 'bg-amber-100 text-amber-900 border-amber-200',
  celebratory: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

interface Props {
  section: string;
  field: string;
  fieldLabel: string;
  currentValue: string;
  courseContext: Record<string, string>;
  onApplyExample?: (text: string) => void;
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
  const [result, setResult] = useState<CoachResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchCoach() {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const res = await getCoachSuggestion({
        section,
        field,
        current_value: currentValue,
        course_context: courseContext,
      });
      setResult(res);
    } catch (e) {
      setError(humanError(e, 'Could not reach the coach.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={fetchCoach}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
      >
        <span aria-hidden>✨</span>
        {loading ? 'Coach thinking…' : 'Ask the Coach'}
      </button>

      {open && (result || error || loading) && (
        <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold text-violet-900">
              Coach — {fieldLabel}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-violet-500 hover:text-violet-700"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {loading && !result && (
            <div className="text-violet-700">Reading your draft…</div>
          )}

          {error && (
            <div className="text-rose-700">
              {error}
            </div>
          )}

          {result && (
            <>
              {result.tone && (
                <span
                  className={
                    'mb-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
                    (TONE_STYLES[result.tone] || TONE_STYLES.encouraging)
                  }
                >
                  {result.tone}
                </span>
              )}
              <p className="mb-3 whitespace-pre-wrap text-slate-800">{result.suggestion}</p>
              {result.examples.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                    Examples you can remix
                  </div>
                  {result.examples.map((ex, i) => (
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
