import { useNavigate } from 'react-router-dom';
import AuthMenu from './AuthMenu';
import SaveResume from './SaveResume';

interface Props {
  title: string;
  subtitle: string;
  accent: 'marketing' | 'pedagogy';
  switchTo: 'marketing' | 'pedagogy';
  remoteId: string | null;
  remoteStatus: 'idle' | 'saving' | 'saved' | 'error';
  onPublish: () => Promise<string>;
  onNew?: () => void;
}

const ACCENTS = {
  marketing: {
    kicker: 'text-emerald-700',
    switchBg: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    switchLabel: 'Switch to course design →',
    switchIcon: '🎓',
  },
  pedagogy: {
    kicker: 'text-violet-700',
    switchBg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    switchLabel: 'Switch to marketing & pricing →',
    switchIcon: '📣',
  },
};

export default function WorkspaceHeader({
  title,
  subtitle,
  accent,
  switchTo,
  remoteId,
  remoteStatus,
  onPublish,
  onNew,
}: Props) {
  const navigate = useNavigate();
  const styles = ACCENTS[accent];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="min-w-0">
          <div className={'text-xs font-semibold uppercase tracking-wide ' + styles.kicker}>
            Thrive Academy · {subtitle}
          </div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            ← Home
          </button>
          <button
            type="button"
            onClick={() => navigate('/' + switchTo)}
            className={'rounded-lg px-3 py-1.5 text-sm font-medium ' + styles.switchBg}
          >
            <span aria-hidden className="mr-1">{styles.switchIcon}</span>
            {styles.switchLabel}
          </button>
          <button
            type="button"
            onClick={() => navigate('/preview')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Preview
          </button>
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
            onPublish={onPublish}
            onNew={onNew}
          />
        </div>
      </div>
    </header>
  );
}
