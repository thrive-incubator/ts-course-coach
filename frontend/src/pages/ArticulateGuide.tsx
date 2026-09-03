import { useNavigate } from 'react-router-dom';

export default function ArticulateGuide() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Thrive Academy · Guide
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              How to use Articulate for my modules
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Step-by-step guide for building your modules in Articulate Rise 360.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/pedagogy')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              ← Back to pedagogy
            </button>
            <a
              href="/articulate-guide.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              Download PDF
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        <div className="h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <object
            data="/articulate-guide.pdf"
            type="application/pdf"
            className="h-full w-full"
            aria-label="How to use Articulate for my modules — PDF guide"
          >
            <iframe
              src="/articulate-guide.pdf"
              title="How to use Articulate for my modules"
              className="h-full w-full"
            />
            <div className="p-6 text-sm text-slate-700">
              Your browser can&apos;t display the embedded PDF.{' '}
              <a
                href="/articulate-guide.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-700 underline hover:text-sky-900"
              >
                Open the guide in a new tab
              </a>
              .
            </div>
          </object>
        </div>
      </main>
    </div>
  );
}
