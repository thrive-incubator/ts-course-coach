import { useRef, useState } from 'react';
import { humanError, importConceptualization } from '../services/api';
import type { Proposal } from '../types/proposal';

interface Props {
  proposal: Proposal;
  onImport: (imported: Partial<Proposal>, fieldsExtracted: string[]) => void;
}

type Status = 'idle' | 'working' | 'done' | 'error';

export default function ImportConceptualization({ proposal, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [pasted, setPasted] = useState('');
  const [lastFields, setLastFields] = useState<string[]>([]);
  const [inferredFields, setInferredFields] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const nonEmptyOverviewFields = Object.entries(proposal.course_overview).filter(
    ([, v]) => typeof v === 'string' && v.trim().length > 0
  ).length;
  const hasExistingContent =
    nonEmptyOverviewFields > 0 ||
    proposal.rationale.needs_statement.trim().length > 0 ||
    proposal.rationale.evidence_of_demand.trim().length > 0 ||
    proposal.rationale.competitive_landscape.trim().length > 0;

  async function runImport(payload: { file?: File; text?: string }) {
    setStatus('working');
    setMessage(
      payload.file
        ? `Reading ${payload.file.name}…`
        : 'Reading your pasted content…'
    );
    try {
      const res = await importConceptualization(payload);
      if (!res.fields_extracted.length) {
        setStatus('error');
        setMessage(
          "I couldn't find any recognizable course-proposal fields in that. Try pasting the form text directly, or upload the PDF export of your Conceptualization Tool response."
        );
        return;
      }
      onImport(res.imported, res.fields_extracted);
      setLastFields(res.fields_extracted);
      setInferredFields(res.inferred_fields || []);
      setStatus('done');
      setMessage(
        `Pulled ${res.fields_extracted.length} field${res.fields_extracted.length === 1 ? '' : 's'} into your proposal.`
      );
      setPasted('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setStatus('error');
      setMessage(humanError(e, 'Import failed'));
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (hasExistingContent && !confirmOverwrite()) {
      e.target.value = '';
      return;
    }
    void runImport({ file });
  }

  function onPasteSubmit() {
    if (!pasted.trim()) return;
    if (hasExistingContent && !confirmOverwrite()) return;
    void runImport({ text: pasted.trim() });
  }

  function confirmOverwrite() {
    return window.confirm(
      "You've already filled in some fields. Importing will overwrite matching fields with what's in the uploaded content. Continue?"
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            Already have a Course Conceptualization Tool response?
          </div>
          <h3 className="mt-1 text-base font-semibold text-slate-900">
            Import it and skip the retyping
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Upload a PDF/DOCX of your submitted form, or paste the text. I'll pull
            out your course name, description, audience, type, format, needs
            statement, evidence of demand, and competitive landscape — pre-filled
            for you to refine.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-100"
        >
          {open ? 'Hide' : 'Import'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Upload PDF, DOCX, PPTX, TXT, or MD
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.pptx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown"
              onChange={onFileChange}
              disabled={status === 'working'}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-violet-700 disabled:opacity-50"
            />
          </div>

          <div className="text-center text-xs uppercase tracking-wide text-slate-500">or</div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Paste the text of your Conceptualization Tool response
            </label>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              disabled={status === 'working'}
              rows={5}
              placeholder="Paste the full form content here — questions and answers, in any order. I'll figure out which field is which."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none disabled:opacity-50"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={onPasteSubmit}
                disabled={!pasted.trim() || status === 'working'}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Import pasted text
              </button>
            </div>
          </div>

          {status !== 'idle' && (
            <div
              className={
                'rounded-lg border px-3 py-2 text-sm ' +
                (status === 'working'
                  ? 'border-slate-200 bg-white text-slate-700'
                  : status === 'done'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-rose-300 bg-rose-50 text-rose-900')
              }
            >
              <div className="font-medium">
                {status === 'working' && 'Working…'}
                {status === 'done' && '✓ Imported'}
                {status === 'error' && 'Import failed'}
              </div>
              <div className="mt-0.5">{message}</div>
              {status === 'done' && lastFields.length > 0 && (
                <div className="mt-2 text-xs text-emerald-800">
                  <div className="font-semibold">Fields pulled in:</div>
                  <ul className="mt-1 list-inside list-disc">
                    {lastFields.map((f) => {
                      const inferred = inferredFields.includes(f);
                      return (
                        <li key={f} className={inferred ? 'text-amber-800' : undefined}>
                          {f}
                          {inferred && (
                            <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                              inferred
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {status === 'done' && inferredFields.length > 0 && (
                <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                  <span className="font-semibold">Check these — inferred, not quoted:</span>{' '}
                  {inferredFields.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
