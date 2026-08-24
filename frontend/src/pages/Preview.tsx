import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { exportProposal } from '../services/api';
import { useProposal } from '../hooks/useProposal';

const mdComponents = {
  h1: (props: any) => <h1 className="mb-4 mt-6 text-3xl font-bold text-slate-900" {...props} />,
  h2: (props: any) => <h2 className="mb-3 mt-8 border-b border-slate-200 pb-1 text-2xl font-semibold text-slate-900" {...props} />,
  h3: (props: any) => <h3 className="mb-2 mt-6 text-xl font-semibold text-slate-900" {...props} />,
  h4: (props: any) => <h4 className="mb-2 mt-4 text-lg font-semibold text-slate-900" {...props} />,
  p: (props: any) => <p className="my-3 leading-relaxed text-slate-800" {...props} />,
  ul: (props: any) => <ul className="my-3 list-disc space-y-1 pl-6 text-slate-800" {...props} />,
  ol: (props: any) => <ol className="my-3 list-decimal space-y-1 pl-6 text-slate-800" {...props} />,
  li: (props: any) => <li className="leading-relaxed" {...props} />,
  strong: (props: any) => <strong className="font-semibold text-slate-900" {...props} />,
  em: (props: any) => <em className="italic" {...props} />,
  a: (props: any) => <a className="text-violet-700 underline hover:text-violet-900" target="_blank" rel="noreferrer" {...props} />,
  blockquote: (props: any) => <blockquote className="my-3 border-l-4 border-violet-200 bg-violet-50 py-2 pl-4 italic text-slate-700" {...props} />,
  code: ({ inline, ...props }: any) =>
    inline ? (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-800" {...props} />
    ) : (
      <code className="block overflow-x-auto rounded bg-slate-100 p-3 font-mono text-sm text-slate-800" {...props} />
    ),
  pre: (props: any) => <pre className="my-3 overflow-x-auto rounded bg-slate-100 p-3 text-sm" {...props} />,
  hr: () => <hr className="my-6 border-slate-200" />,
  table: (props: any) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border-collapse border border-slate-200 text-sm" {...props} />
    </div>
  ),
  thead: (props: any) => <thead className="bg-slate-50" {...props} />,
  th: (props: any) => <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-900" {...props} />,
  td: (props: any) => <td className="border border-slate-200 px-3 py-2 align-top text-slate-800" {...props} />,
};

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
            <div className="text-base">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {markdown}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
