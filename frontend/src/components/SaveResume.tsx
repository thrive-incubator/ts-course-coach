import { useState } from 'react';

interface Props {
  remoteId: string | null;
  remoteStatus: 'idle' | 'saving' | 'saved' | 'error';
  onPublish: () => Promise<string>;
  onNew?: () => void;
}

export default function SaveResume({ remoteId, remoteStatus, onPublish, onNew }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildUrl(id: string): string {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('id', id);
      // Anchor bookmark on wizard root, not brief/preview.
      u.pathname = '/';
      u.hash = '';
      return u.toString();
    } catch {
      return `${window.location.origin}/?id=${id}`;
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      await onPublish();
      setShowDialog(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setPublishing(false);
    }
  }

  const url = remoteId ? buildUrl(remoteId) : '';

  return (
    <>
      <div className="flex items-center gap-2">
        {remoteId && (
          <span
            className={
              'text-xs ' +
              (remoteStatus === 'saving'
                ? 'text-slate-500'
                : remoteStatus === 'error'
                ? 'text-rose-600'
                : 'text-emerald-700')
            }
            title={remoteId}
          >
            {remoteStatus === 'saving'
              ? 'Saving…'
              : remoteStatus === 'error'
              ? 'Save failed'
              : '✓ Cloud-saved'}
          </span>
        )}
        {onNew && (
          <button
            type="button"
            onClick={() => {
              const ok = window.confirm(
                remoteId
                  ? 'Start a new proposal? Your current one stays saved under its link.'
                  : 'Start a new proposal? Unsaved work in this draft will be cleared.'
              );
              if (ok) onNew();
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            title="Start a fresh proposal"
          >
            New
          </button>
        )}
        <button
          type="button"
          onClick={remoteId ? () => setShowDialog(true) : publish}
          disabled={publishing}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {publishing ? 'Saving…' : remoteId ? 'Save link' : 'Save & get link'}
        </button>
      </div>

      {showDialog && remoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Saved
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Bookmark this link</h3>
            <p className="mb-4 text-sm text-slate-600">
              Open this link on any device to pick up where you left off. Anyone with the link can
              view and edit — treat it like a Google Doc share URL.
            </p>
            <div className="mb-3 flex items-center gap-2">
              <input
                readOnly
                value={url}
                className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Your work also auto-saves as you type — no need to click Save again on this device.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-rose-700">
          {error}
        </div>
      )}
    </>
  );
}
