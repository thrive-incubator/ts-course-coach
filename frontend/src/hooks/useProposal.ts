import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMPTY_PROPOSAL,
  migrateLegacyRow,
  type CourseModule,
  type Proposal,
} from '../types/proposal';
import { loadProposal, saveProposal, saveProposalKeepalive } from '../services/api';
import { getAuthToken } from './useAuth';
import { SIGNED_IN_EVENT, SIGNED_OUT_EVENT } from './authEvents';

const STORAGE_KEY = 'ts-course-coach:proposal:v2';
const ID_STORAGE_KEY = 'ts-course-coach:remote-id:v1';
const AUTOSAVE_DELAY_MS = 1200;
const EMPTY_JSON = JSON.stringify(EMPTY_PROPOSAL);

// Module-level state survives client-side route changes (each page mounts its
// own useProposal) but resets on a full page load. That gives us:
//   - one server fetch per page load, not one per navigation (which could race
//     an in-flight save and overwrite fresh edits with older server data);
//   - a way to skip autosaving content the server already has.
let hydratedForId: string | null = null;
let lastSavedJson: string | null = null;

function loadLocal(): Proposal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(EMPTY_PROPOSAL);
    const parsed = JSON.parse(raw);
    return hydrate(parsed);
  } catch {
    return structuredClone(EMPTY_PROPOSAL);
  }
}

function readStoredId(): string | null {
  try {
    return localStorage.getItem(ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeId(id: string | null) {
  try {
    if (id) localStorage.setItem(ID_STORAGE_KEY, id);
    else localStorage.removeItem(ID_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Keep ?id= in the address bar in sync so bookmarks/reloads resume the right proposal. */
function setUrlId(id: string | null) {
  try {
    const u = new URL(window.location.href);
    if (id) u.searchParams.set('id', id);
    else u.searchParams.delete('id');
    window.history.replaceState({}, '', u.toString());
  } catch {
    // ignore
  }
}

/** Coerce whatever's in storage / on the wire into a well-shaped Proposal. */
export function hydrate(raw: any): Proposal {
  const base = structuredClone(EMPTY_PROPOSAL);
  const merged: Proposal = {
    ...base,
    ...raw,
    primary_contact: { ...base.primary_contact, ...(raw?.primary_contact || {}) },
    course_overview: { ...base.course_overview, ...(raw?.course_overview || {}) },
    rationale: { ...base.rationale, ...(raw?.rationale || {}) },
    enrollment: { ...base.enrollment, ...(raw?.enrollment || {}) },
    design: { ...base.design, ...(raw?.design || {}) },
    financials: { ...base.financials, ...(raw?.financials || {}) },
    social_plan: { ...base.social_plan, ...(raw?.social_plan || {}) },
    marketing_extras: {
      ...base.marketing_extras,
      ...(raw?.marketing_extras || {}),
      outreach_checklist_done: {
        ...base.marketing_extras.outreach_checklist_done,
        ...((raw?.marketing_extras?.outreach_checklist_done as Record<string, boolean>) || {}),
      },
    },
    pricing_deep: { ...base.pricing_deep, ...(raw?.pricing_deep || {}) },
  };

  const rawEnrollment = raw?.enrollment || {};
  const legacyRM =
    typeof rawEnrollment.recruitment_and_marketing === 'string'
      ? rawEnrollment.recruitment_and_marketing
      : '';
  if (!merged.enrollment.recruitment && legacyRM) {
    merged.enrollment.recruitment = legacyRM;
  }
  delete (merged.enrollment as any).recruitment_and_marketing;

  const design = merged.design as any;
  let modules: CourseModule[] = Array.isArray(design.modules) ? design.modules : [];

  if (modules.length === 0 && Array.isArray(design.curriculum_outline)) {
    modules = design.curriculum_outline.map((r: any) => migrateLegacyRow(r));
  }

  modules = modules.map((m: any) => ({
    id: m.id || `mod_${Math.random().toString(36).slice(2, 10)}`,
    module_name: m.module_name || '',
    contact_hours: m.contact_hours || '',
    faculty: m.faculty || '',
    format: m.format || '',
    essential_question: m.essential_question || '',
    objectives: Array.isArray(m.objectives)
      ? m.objectives.map((o: any) => ({ text: o.text || '', bloom: o.bloom || '' }))
      : [],
    critical_information: m.critical_information || '',
    engagement_opportunities: m.engagement_opportunities || '',
    interactive_features: Array.isArray(m.interactive_features) ? m.interactive_features : [],
    interactive_features_notes: m.interactive_features_notes || '',
    required_readings: m.required_readings || '',
    recommended_readings: m.recommended_readings || '',
    assignments: m.assignments || '',
    materials: Array.isArray(m.materials)
      ? m.materials.map((mat: any) => ({
          id: mat.id || `mat_${Math.random().toString(36).slice(2, 10)}`,
          filename: mat.filename || 'file',
          uploaded_at: mat.uploaded_at || new Date().toISOString(),
          feedback: mat.feedback || '',
          status: mat.status || 'ready',
          error: mat.error,
        }))
      : [],
  }));

  merged.design.modules = modules;
  delete (merged.design as any).curriculum_outline;
  return merged;
}

function urlIdParam(): string | null {
  try {
    const u = new URL(window.location.href);
    const id = u.searchParams.get('id');
    return id && id.match(/^[A-Za-z0-9_-]{4,64}$/) ? id : null;
  } catch {
    return null;
  }
}

export type RemoteStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useProposal() {
  const [proposal, setProposal] = useState<Proposal>(loadLocal);
  const [remoteId, setRemoteId] = useState<string | null>(() => urlIdParam() || readStoredId());
  const needsHydrate = !!remoteId && hydratedForId !== remoteId;
  const [loadingRemote, setLoadingRemote] = useState<boolean>(needsHydrate);
  // Autosave is only allowed once we know local state is at least as new as
  // the server's copy — i.e. after a successful load, or when there's nothing
  // on the server to protect.
  const [hydrated, setHydrated] = useState<boolean>(!needsHydrate);
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>('idle');
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [authTick, setAuthTick] = useState(0);

  const saveTimerRef = useRef<number | null>(null);
  // What a scheduled-but-unfired autosave would send; flushed on unmount/unload.
  const pendingRef = useRef<{ proposal: Proposal; id: string | null } | null>(null);

  // ---- Hydrate from server whenever we hold a remote id we haven't loaded this page-load.
  useEffect(() => {
    if (!remoteId || hydratedForId === remoteId) return;
    let alive = true;
    setLoadingRemote(true);
    setHydrated(false);
    setRemoteError(null);
    loadProposal(remoteId)
      .then((data) => {
        if (!alive) return;
        hydratedForId = remoteId;
        const loaded = hydrate(data);
        lastSavedJson = JSON.stringify(loaded);
        setProposal(loaded);
        storeId(remoteId);
        setUrlId(remoteId);
        setHydrated(true);
        setRemoteStatus('saved');
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.startsWith('404')) {
          // The server copy is gone (e.g. backend redeploy). Keep whatever is
          // local, detach from the dead id, and let the user re-save.
          hydratedForId = null;
          lastSavedJson = null;
          storeId(null);
          setUrlId(null);
          setRemoteId(null);
          setHydrated(true);
          setRemoteStatus('idle');
          setRemoteError(
            'That saved proposal no longer exists on the server. Your local copy is shown — use "Save & get link" to save it again.'
          );
        } else {
          setRemoteStatus('error');
          setRemoteError(
            `Could not load your saved proposal (${msg.slice(0, 80)}). Autosave is paused so nothing gets overwritten.`
          );
        }
      })
      .finally(() => {
        if (alive) setLoadingRemote(false);
      });
    return () => {
      alive = false;
    };
  }, [remoteId, loadAttempt]);

  // ---- Local persistence — always mirror.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proposal));
    } catch {
      // ignore
    }
  }, [proposal]);

  // ---- React to sign-in / sign-out from the (separate) auth hook.
  useEffect(() => {
    const onSignedIn = () => {
      // Force a save so the proposal gets associated with the account,
      // minting an id if this draft has never been saved.
      lastSavedJson = null;
      setAuthTick((t) => t + 1);
    };
    const onSignedOut = () => {
      startNew();
    };
    window.addEventListener(SIGNED_IN_EVENT, onSignedIn);
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => {
      window.removeEventListener(SIGNED_IN_EVENT, onSignedIn);
      window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adoptId = useCallback((id: string) => {
    hydratedForId = id;
    setRemoteId(id);
    storeId(id);
    setUrlId(id);
  }, []);

  const doSave = useCallback(
    async (p: Proposal, id: string | null): Promise<string> => {
      setRemoteStatus('saving');
      try {
        const res = await saveProposal(p, id || undefined);
        lastSavedJson = JSON.stringify(p);
        if (!id) adoptId(res.id);
        setRemoteStatus('saved');
        setRemoteError(null);
        return res.id;
      } catch (e) {
        setRemoteStatus('error');
        throw e;
      }
    },
    [adoptId]
  );

  // ---- Debounced remote autosave.
  useEffect(() => {
    if (!hydrated || loadingRemote) return;
    const json = JSON.stringify(proposal);
    if (!remoteId) {
      // Never saved: only auto-create a server copy for signed-in users with
      // real content. Anonymous users opt in via "Save & get link".
      if (!getAuthToken() || json === EMPTY_JSON) return;
    }
    if (json === lastSavedJson) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    pendingRef.current = { proposal, id: remoteId };
    saveTimerRef.current = window.setTimeout(() => {
      pendingRef.current = null;
      doSave(proposal, remoteId).catch(() => {
        /* status already set */
      });
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [proposal, remoteId, hydrated, loadingRemote, authTick, doSave]);

  // ---- Flush a pending autosave on navigation away / tab close so the last
  // ~1s of typing isn't lost. Only for proposals that already have an id.
  useEffect(() => {
    const flush = () => {
      const pending = pendingRef.current;
      if (!pending || !pending.id) return;
      pendingRef.current = null;
      lastSavedJson = JSON.stringify(pending.proposal);
      saveProposalKeepalive(pending.proposal, pending.id);
    };
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  const updateSection = useCallback(
    <K extends keyof Proposal>(section: K, patch: Partial<Proposal[K]>) => {
      setProposal((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
    },
    []
  );

  const updateModule = useCallback((moduleId: string, patch: Partial<CourseModule>) => {
    setProposal((prev) => ({
      ...prev,
      design: {
        ...prev.design,
        modules: prev.design.modules.map((m) => (m.id === moduleId ? { ...m, ...patch } : m)),
      },
    }));
  }, []);

  const addModule = useCallback((mod: CourseModule) => {
    setProposal((prev) => ({
      ...prev,
      design: { ...prev.design, modules: [...prev.design.modules, mod] },
    }));
  }, []);

  const removeModule = useCallback((moduleId: string) => {
    setProposal((prev) => ({
      ...prev,
      design: {
        ...prev.design,
        modules: prev.design.modules.filter((m) => m.id !== moduleId),
      },
    }));
  }, []);

  /** Start a fresh, unsaved proposal. Any pending autosave for the old one is flushed first. */
  const startNew = useCallback(() => {
    const pending = pendingRef.current;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    if (pending && pending.id) {
      pendingRef.current = null;
      saveProposalKeepalive(pending.proposal, pending.id);
    }
    hydratedForId = null;
    lastSavedJson = null;
    storeId(null);
    setUrlId(null);
    setRemoteId(null);
    setProposal(structuredClone(EMPTY_PROPOSAL));
    setRemoteStatus('idle');
    setRemoteError(null);
    setHydrated(true);
    setLoadingRemote(false);
  }, []);

  const retryLoad = useCallback(() => setLoadAttempt((n) => n + 1), []);

  const publishRemote = useCallback(async () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    pendingRef.current = null;
    return doSave(proposal, remoteId);
  }, [proposal, remoteId, doSave]);

  return {
    proposal,
    setProposal,
    updateSection,
    updateModule,
    addModule,
    removeModule,
    /** @deprecated use startNew */
    reset: startNew,
    startNew,
    remoteId,
    remoteStatus,
    remoteError,
    retryLoad,
    publishRemote,
    loadingRemote,
  };
}
