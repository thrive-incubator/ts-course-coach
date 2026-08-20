import { useState } from 'react';
import { analyzePricing, type PricingResponse } from '../services/api';

interface Props {
  courseName: string;
  courseDescription: string;
  courseType: string;
  courseFormat: string;
  intendedAudiences: string;
  duration: string;
  contactHours: string;
  cohortSize: string;
  currentTuition: string;
  onApplyPrice?: (price: string) => void;
}

export default function PricingCoach(props: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PricingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze =
    props.courseName.trim().length > 0 &&
    props.intendedAudiences.trim().length > 0;

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await analyzePricing({
        course_name: props.courseName,
        course_description: props.courseDescription,
        course_type: props.courseType,
        course_format: props.courseFormat,
        intended_audiences: props.intendedAudiences,
        duration: props.duration,
        contact_hours: props.contactHours,
        cohort_size: props.cohortSize,
        current_tuition: props.currentTuition,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not analyze pricing.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Pricing intelligence
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Benchmark against comparable university programs
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            The coach looks at your course details and proposes a defensible tuition band based on
            real, publicly-offered continuing-ed and professional-certificate programs whose format,
            duration, and audience most closely match.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading || !canAnalyze}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          title={!canAnalyze ? 'Add a course name and intended audience first' : ''}
        >
          {loading
            ? 'Analyzing…'
            : result
            ? 'Re-analyze'
            : '📊 Analyze pricing'}
        </button>
      </div>

      {!canAnalyze && !result && (
        <p className="text-xs text-slate-500">
          Add a course name and intended audience (in the landing page or overview) to run this.
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-5">
          <div className="rounded-xl border border-emerald-300 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Suggested tuition band
            </div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              {result.suggested_range_low} <span className="text-slate-400">–</span>{' '}
              {result.suggested_range_high}
            </div>
            {result.positioning_note && (
              <p className="mt-3 text-sm text-slate-700">{result.positioning_note}</p>
            )}
          </div>

          {result.scenarios.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Three price scenarios
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {result.scenarios.map((s, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {s.label}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{s.price}</div>
                    {s.tradeoff && (
                      <p className="mt-2 flex-1 text-xs text-slate-600">{s.tradeoff}</p>
                    )}
                    {props.onApplyPrice && (
                      <button
                        type="button"
                        onClick={() => props.onApplyPrice && props.onApplyPrice(s.price)}
                        className="mt-3 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                      >
                        Use this price
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.comparables.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Comparable programs
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="hidden grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
                  <div className="col-span-4">Program</div>
                  <div className="col-span-3">Format · duration</div>
                  <div className="col-span-2">Price</div>
                  <div className="col-span-3">Why comparable</div>
                </div>
                {result.comparables.map((c, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0 md:grid-cols-12"
                  >
                    <div className="md:col-span-4">
                      <div className="font-semibold text-slate-900">{c.program}</div>
                      <div className="text-xs text-slate-500">{c.institution}</div>
                    </div>
                    <div className="text-xs text-slate-600 md:col-span-3">
                      {c.format}
                      {c.format && c.duration ? ' · ' : ''}
                      {c.duration}
                    </div>
                    <div className="text-sm font-semibold text-emerald-700 md:col-span-2">
                      {c.price_range}
                    </div>
                    <div className="text-xs text-slate-600 md:col-span-3">{c.why_comparable}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.caveats && (
            <p className="text-xs italic text-slate-500">{result.caveats}</p>
          )}
        </div>
      )}
    </div>
  );
}
