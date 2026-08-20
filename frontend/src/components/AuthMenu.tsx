import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { listMyProposals, type MyProposalSummary } from '../services/api';

interface Props {
  onLoadProposal?: (id: string) => void;
}

export default function AuthMenu({ onLoadProposal }: Props) {
  const { email, signIn, signOut, status, error } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showProposals, setShowProposals] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setInlineError(null);
    try {
      await signIn(inputEmail);
      setShowSignIn(false);
      setInputEmail('');
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : 'Sign-in failed');
    }
  }

  return (
    <>
      {email ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            title={email}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700"
              aria-hidden
            >
              {email.charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[160px] truncate">{email}</span>
            <span aria-hidden className="text-xs text-slate-400">▾</span>
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
                aria-hidden
              />
              <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Signed in as
                  </div>
                  <div className="mt-0.5 truncate text-sm text-slate-800">{email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowProposals(true);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  📚 My proposals
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    void signOut();
                  }}
                  className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSignIn(true)}
          className="rounded-lg border border-violet-600 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50"
        >
          Sign in
        </button>
      )}

      {showSignIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setShowSignIn(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
              Sign in
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">
              Save your work across sessions
            </h3>
            <p className="mb-4 text-sm text-slate-600">
              Enter your email to sign in. Your proposals will be saved to your account
              so you can come back on any device and pick up where you left off.
            </p>
            <form onSubmit={submit}>
              <input
                type="email"
                autoFocus
                required
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="you@georgetown.edu"
                className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              {(inlineError || error) && (
                <div className="mb-3 text-xs text-rose-700">{inlineError || error}</div>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSignIn(false)}
                  className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === 'signing-in'}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {status === 'signing-in' ? 'Signing in…' : 'Sign in'}
                </button>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                No password needed — this is a lightweight sign-in for the prototype.
                Anyone with your email address will be able to open your proposals, so
                use a work email you don&apos;t mind sharing.
              </p>
            </form>
          </div>
        </div>
      )}

      {showProposals && email && (
        <MyProposalsModal
          onClose={() => setShowProposals(false)}
          onLoad={(id) => {
            setShowProposals(false);
            onLoadProposal?.(id);
          }}
        />
      )}
    </>
  );
}

interface ModalProps {
  onClose: () => void;
  onLoad: (id: string) => void;
}

function MyProposalsModal({ onClose, onLoad }: ModalProps) {
  const [proposals, setProposals] = useState<MyProposalSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listMyProposals()
      .then((r) => {
        if (alive) setProposals(r.proposals);
      })
      .catch((e) => {
        if (alive) setErr(e instanceof Error ? e.message : 'Load failed');
      });
    return () => {
      alive = false;
    };
  }, []);

  function fmtDate(ts: number): string {
    if (!ts) return '';
    try {
      const d = new Date(ts * 1000);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              My proposals
            </div>
            <h3 className="text-lg font-bold text-slate-900">Pick one to open</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
          {err && (
            <div className="m-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</div>
          )}
          {!err && proposals === null && (
            <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
          )}
          {!err && proposals && proposals.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">
              No saved proposals yet. Start building one and it will be saved to your account
              automatically.
            </div>
          )}
          {!err && proposals && proposals.length > 0 && (
            <ul className="space-y-1">
              {proposals.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onLoad(p.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left hover:bg-violet-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {p.course_name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Updated {fmtDate(p.updated_at)}
                      </div>
                    </div>
                    <span
                      className="shrink-0 text-xs font-medium text-violet-700"
                      aria-hidden
                    >
                      Open →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
