import { useNavigate } from 'react-router-dom';
import AuthMenu from '../components/AuthMenu';
import { Field, TextInput, Textarea } from '../components/Field';
import ImportConceptualization from '../components/ImportConceptualization';
import SaveResume from '../components/SaveResume';
import { useProposal } from '../hooks/useProposal';
import type { Proposal } from '../types/proposal';

export default function Landing() {
  const {
    proposal,
    setProposal,
    remoteId,
    remoteStatus,
    publishRemote,
    loadingRemote,
    updateSection,
    remoteError,
    retryLoad,
    startNew,
  } = useProposal();
  const navigate = useNavigate();

  function mergeImported(imported: Partial<Proposal>) {
    setProposal((prev) => ({
      ...prev,
      primary_contact: { ...prev.primary_contact, ...(imported.primary_contact || {}) },
      course_overview: { ...prev.course_overview, ...(imported.course_overview || {}) },
      rationale: { ...prev.rationale, ...(imported.rationale || {}) },
    }));
  }

  const hasBasics =
    proposal.course_overview.course_name.trim().length > 0 &&
    proposal.course_overview.intended_audiences.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Thrive Academy
            </div>
            <h1 className="text-xl font-bold text-slate-900">Course Builder</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AuthMenu
              onLoadProposal={(id) => {
                const u = new URL(window.location.href);
                u.searchParams.set('id', id);
                u.pathname = '/';
                u.hash = '';
                window.location.assign(u.toString());
              }}
            />
            <SaveResume
              remoteId={remoteId}
              remoteStatus={remoteStatus}
              onPublish={publishRemote}
              onNew={startNew}
            />
          </div>
        </div>
      </header>

      {loadingRemote && (
        <div className="bg-emerald-50 py-2 text-center text-xs text-emerald-800">
          Loading your saved work…
        </div>
      )}
      {remoteError && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          <span>{remoteError}</span>
          {remoteStatus === 'error' && (
            <button
              type="button"
              onClick={retryLoad}
              className="rounded border border-amber-700 px-2 py-0.5 font-medium hover:bg-amber-100"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <main className="mx-auto max-w-4xl px-6 py-10">
        <ImportConceptualization proposal={proposal} onImport={mergeImported} />

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
            Start here
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900">
            Tell us the basics — then choose your workspace
          </h2>
          <p className="mb-8 text-sm text-slate-500">
            A few quick fields so both tools have the context they need. You can refine or
            expand later inside either workspace. Everything auto-saves.
          </p>

          <Field label="Course name">
            <TextInput
              value={proposal.course_overview.course_name}
              onChange={(v) => updateSection('course_overview', { course_name: v })}
              placeholder="Working title — you can refine later"
            />
          </Field>

          <Field
            label="Short course description"
            hint="A sentence or two. What is this, and what will learners walk away able to do?"
          >
            <Textarea
              value={proposal.course_overview.course_description}
              onChange={(v) => updateSection('course_overview', { course_description: v })}
              placeholder="Who it's for, what they'll learn, why it matters."
              rows={3}
            />
          </Field>

          <Field
            label="Intended audience"
            hint="Be specific — roles, career stage, sector. The more concrete, the better the coaching."
          >
            <Textarea
              value={proposal.course_overview.intended_audiences}
              onChange={(v) => updateSection('course_overview', { intended_audiences: v })}
              placeholder="e.g. Mid-career IECMH consultants working in state early-intervention systems"
              rows={2}
            />
          </Field>
        </section>

        <div className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
          Choose your workspace
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/marketing')}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg"
          >
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl text-emerald-700"
              aria-hidden
            >
              📣
            </div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Workspace 1
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900 group-hover:text-emerald-800">
              Marketing &amp; pricing
            </h3>
            <p className="mb-4 flex-1 text-sm text-slate-600">
              Sharpen your rationale, competitive positioning, recruitment plan, and financials —
              then get a pricing benchmark against comparable university programs and a launch-ready
              marketing brief.
            </p>
            <ul className="mb-4 space-y-1.5 text-xs text-slate-600">
              <li>✓ Needs statement + evidence of demand coaching</li>
              <li>✓ Competitive landscape</li>
              <li>✓ <strong className="text-emerald-800">Pricing intelligence</strong> — comparable programs + suggested tuition band</li>
              <li>✓ Audience personas, headlines, channels, social copy</li>
            </ul>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 group-hover:text-emerald-900">
              Open marketing workspace →
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/pedagogy')}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-lg"
          >
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-2xl text-violet-700"
              aria-hidden
            >
              🎓
            </div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
              Workspace 2
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900 group-hover:text-violet-800">
              Course design &amp; pedagogy
            </h3>
            <p className="mb-4 flex-1 text-sm text-slate-600">
              Lead with an essential question. Design module-by-module with Bloom-aligned objectives,
              engagement moves, interactive features, and upload slides / lesson plans for targeted
              coaching feedback.
            </p>
            <ul className="mb-4 space-y-1.5 text-xs text-slate-600">
              <li>✓ Course-level essential question</li>
              <li>✓ Rich per-module design (objectives, critical info, engagement)</li>
              <li>✓ <strong className="text-violet-800">Upload slides / lesson plans</strong> for coach feedback</li>
              <li>✓ Assessment methods, student support, CQI</li>
            </ul>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 group-hover:text-violet-900">
              Open pedagogy workspace →
            </span>
          </button>
        </div>

        {hasBasics && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => navigate('/preview')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              Preview full proposal
            </button>
            <button
              type="button"
              onClick={() => navigate('/brief')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              Generate marketing brief
            </button>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Your progress auto-saves in this browser. <strong>Sign in</strong> at the top to save
          your proposals to your account so you can come back on any device — or use
          <strong> Save &amp; get link</strong> for a shareable URL.
        </p>
      </main>
    </div>
  );
}
