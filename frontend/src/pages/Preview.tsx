import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportProposal } from '../services/api';
import { useProposal } from '../hooks/useProposal';

export default function Preview() {
  const { proposal } = useProposal();
  const [markdown, setMarkdown] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    exportProposal(proposal)
      .then((r) => {
        if (alive) setMarkdown(r.markdown);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Export failed.');
      });
    return () => {
      alive = false;
    };
  }, [proposal]);

  const courseName = proposal.course_overview.course_name || '(Untitled course)';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Thrive Academy · Proposal Preview
            </div>
            <h1 className="text-xl font-bold text-slate-900">{courseName}</h1>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              ← Back to wizard
            </Link>
            <Link
              to="/brief"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Marketing brief
            </Link>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(markdown);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              disabled={!markdown}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {copied ? 'Copied' : 'Copy markdown'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {error && <p className="text-sm text-rose-700">{error}</p>}
          {!error && !markdown && <p className="text-sm text-slate-500">Rendering…</p>}
          {markdown && (
            <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-900">
              {markdown}
            </pre>
          )}
        </div>
      </main>
    </div>
  );
}
