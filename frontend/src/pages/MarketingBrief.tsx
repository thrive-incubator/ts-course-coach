import { useState } from 'react';
import { Link } from 'react-router-dom';
import { generateMarketingBrief, type MarketingBrief as Brief } from '../services/api';
import { useProposal } from '../hooks/useProposal';

export default function MarketingBrief() {
  const { proposal } = useProposal();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const b = await generateMarketingBrief(proposal);
      setBrief(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate the brief.');
    } finally {
      setLoading(false);
    }
  }

  const courseName = proposal.course_overview.course_name || '(Untitled course)';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Thrive Academy · Marketing Brief
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
              to="/preview"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Preview proposal
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {!brief && !loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-2 text-2xl font-bold text-slate-900">Generate marketing brief</h2>
            <p className="mb-6 text-sm text-slate-600">
              The Coach will read your full proposal and produce:
            </p>
            <ul className="mb-6 space-y-2 text-sm text-slate-700">
              <li>• 2-3 audience personas with triggers + objections</li>
              <li>• A positioning statement in the classic "For X who Y, we are the Z that..." form</li>
              <li>• 5 candidate headlines across different angles</li>
              <li>• 4-6 recruitment channels with per-channel message angles</li>
              <li>• Ready-to-post LinkedIn, Twitter, and Instagram copy</li>
              <li>• 3 email subject-line variants</li>
            </ul>
            <button
              type="button"
              onClick={generate}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              Generate brief ✨
            </button>
            {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="mb-2 text-lg font-semibold text-slate-900">Building your brief…</div>
            <p className="text-sm text-slate-500">
              Reading your proposal, then generating personas, positioning, and copy.
            </p>
          </div>
        )}

        {brief && (
          <div className="space-y-6">
            <Section title="Positioning statement">
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-800">
                {brief.positioning_statement}
              </p>
            </Section>

            <Section title="Audience personas">
              <div className="grid gap-4 sm:grid-cols-2">
                {brief.audience_personas.map((p, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-1 text-sm font-semibold text-slate-900">{p.name}</div>
                    <p className="mb-2 text-xs text-slate-600">{p.context}</p>
                    <div className="mt-2 border-t border-slate-200 pt-2 text-xs">
                      <div className="mb-1">
                        <span className="font-semibold text-emerald-700">Enrols when:</span>{' '}
                        <span className="text-slate-700">{p.trigger}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-rose-700">Hesitates on:</span>{' '}
                        <span className="text-slate-700">{p.objection}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Value propositions">
              <ol className="space-y-2 text-slate-800">
                {brief.value_propositions.map((v, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                      {i + 1}
                    </span>
                    <span>{v}</span>
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="Headline options">
              <ul className="space-y-2">
                {brief.headlines.map((h, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800"
                  >
                    {h}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Recruitment channels">
              <div className="space-y-3">
                {brief.channels.map((c, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-1 text-sm font-semibold text-slate-900">{c.name}</div>
                    <div className="mb-2 text-xs text-slate-500">{c.why}</div>
                    <div className="text-sm text-slate-800">
                      <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                        Angle:
                      </span>{' '}
                      {c.message_angle}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Ready-to-post copy">
              <div className="space-y-4">
                {brief.social_copy.linkedin_post && (
                  <CopyBlock label="LinkedIn post" text={brief.social_copy.linkedin_post} />
                )}
                {brief.social_copy.twitter_thread_opener && (
                  <CopyBlock label="Twitter / X opener" text={brief.social_copy.twitter_thread_opener} />
                )}
                {brief.social_copy.instagram_caption && (
                  <CopyBlock label="Instagram caption" text={brief.social_copy.instagram_caption} />
                )}
              </div>
            </Section>

            <Section title="Email subject lines">
              <ul className="space-y-2">
                {brief.subject_lines.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </Section>

            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={generate}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Regenerate brief
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm text-slate-800">{text}</p>
    </div>
  );
}
