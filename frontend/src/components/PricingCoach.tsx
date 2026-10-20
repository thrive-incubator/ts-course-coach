import { useEffect, useState } from 'react';
import { calculatePricing, humanError, type PricingCalcResponse } from '../services/api';

interface Props {
  contactHours: string;
  contactHoursLive: string;
  contactHoursVirtualSync: string;
  contactHoursAsync: string;
  onContactHoursChange: (v: string) => void;
  onApplyPrice?: (price: string) => void;
}

// Pull the first number out of free text like "40", "40 hours", "1,200".
function parseHours(v: string): number | null {
  const m = v.replace(/,/g, '').match(/\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return n > 0 ? n : null;
}

// Best guess at "any synchronous component?" from the Course Basics breakdown.
function inferSynchronous(p: Props): boolean | null {
  const live = parseHours(p.contactHoursLive) ?? 0;
  const virt = parseHours(p.contactHoursVirtualSync) ?? 0;
  const async = parseHours(p.contactHoursAsync) ?? 0;
  if (live > 0 || virt > 0) return true;
  if (async > 0) return false;
  return null;
}

export default function PricingCoach(props: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PricingCalcResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inferred = inferSynchronous(props);
  const [hasSync, setHasSync] = useState<boolean | null>(inferred);
  const [syncTouched, setSyncTouched] = useState(false);

  useEffect(() => {
    if (!syncTouched) setHasSync(inferred);
  }, [inferred, syncTouched]);

  // Any change to the inputs invalidates the last calculation.
  useEffect(() => {
    setResult(null);
  }, [props.contactHours, hasSync]);

  const hours = parseHours(props.contactHours);
  const canAnalyze = hours !== null && hasSync !== null;

  async function run() {
    if (hours === null || hasSync === null) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await calculatePricing({ total_contact_hours: hours, has_synchronous: hasSync }));
    } catch (e) {
      setError(humanError(e, 'Could not calculate pricing.'));
    } finally {
      setLoading(false);
    }
  }

  function chooseSync(v: boolean) {
    setSyncTouched(true);
    setHasSync(v);
  }

  const choiceClass = (active: boolean) =>
    `rounded-lg border px-3 py-2 text-sm font-medium ${
      active
        ? 'border-emerald-600 bg-emerald-600 text-white'
        : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400'
    }`;

  return (
    <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
      <div className="mb-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Pricing intelligence
        </div>
        <h3 className="text-lg font-bold text-slate-900">Calculate your course tuition</h3>
        <p className="mt-1 text-sm text-slate-600">
          Thrive Academy prices courses per contact hour: <strong>$60/hour</strong> for fully
          asynchronous / self-paced courses, and <strong>$300/hour</strong> for any course with
          synchronous content (in-person or virtual). Answer the two questions below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-800">
            1. How many total contact hours is the course?
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={props.contactHours}
            onChange={(e) => props.onContactHoursChange(e.target.value)}
            placeholder="e.g. 30"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">Same as Total contact hours in Course Basics.</p>
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold text-slate-800">
            2. Does the course have any synchronous components (in-person or virtual)?
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => chooseSync(true)} className={choiceClass(hasSync === true)}>
              Yes
            </button>
            <button type="button" onClick={() => chooseSync(false)} className={choiceClass(hasSync === false)}>
              No — fully asynchronous
            </button>
          </div>
          {!syncTouched && inferred !== null && (
            <p className="mt-1 text-xs text-slate-500">
              Pre-filled from your contact hours by mode in Course Basics.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={loading || !canAnalyze}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          title={!canAnalyze ? 'Answer both questions first' : ''}
        >
          {loading ? 'Calculating…' : '📊 Analyze pricing'}
        </button>
        {!canAnalyze && (
          <span className="text-xs text-slate-500">Answer both questions to calculate tuition.</span>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Suggested tuition
          </div>
          <div className="mt-1 text-3xl font-bold text-slate-900">{result.tuition_display}</div>
          <p className="mt-2 text-sm text-slate-700">
            {result.total_contact_hours} contact hours × ${result.rate_per_hour_usd}/hour —{' '}
            {result.delivery_label.toLowerCase()}.
          </p>
          {props.onApplyPrice && (
            <button
              type="button"
              onClick={() => props.onApplyPrice && props.onApplyPrice(result.tuition_display)}
              className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              Use this price
            </button>
          )}
        </div>
      )}
    </div>
  );
}
