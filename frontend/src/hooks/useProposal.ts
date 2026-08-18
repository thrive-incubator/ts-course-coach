import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMPTY_PROPOSAL,
  migrateLegacyRow,
  type CourseModule,
  type Proposal,
} from '../types/proposal';
import { loadProposal, saveProposal } from '../services/api';

const STORAGE_KEY = 'ts-course-coach:proposal:v2';
const ID_STORAGE_KEY = 'ts-course-coach:remote-id:v1';

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
  };

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

export function useProposal() {
  const [proposal, setProposal] = useState<Proposal>(loadLocal);
  const [remoteId, setRemoteId] = useState<string | null>(() => {
    return urlIdParam() || localStorage.getItem(ID_STORAGE_KEY);
  });
  const [loadingRemote, setLoadingRemote] = useState<boolean>(() => !!urlIdParam());
  const [remoteStatus, setRemoteStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<number | null>(null);

  // Hydrate from server if URL has ?id=
  useEffect(() => {
    const id = urlIdParam();
    if (!id) return;
    let alive = true;
    setLoadingRemote(true);
    loadProposal(id)
      .then((data) => {
        if (!alive) return;
        setProposal(hydrate(data));
        setRemoteId(id);
        localStorage.setItem(ID_STORAGE_KEY, id);
      })
      .catch((e) => {
        console.error('load proposal failed', e);
      })
      .finally(() => {
        if (alive) setLoadingRemote(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Local persistence — always mirror.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proposal));
    } catch {
      // ignore
    }
  }, [proposal]);

  // Debounced remote autosave when we have a remote id.
  useEffect(() => {
    if (!remoteId) return;
    if (loadingRemote) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      setRemoteStatus('saving');
      saveProposal(proposal, remoteId)
        .then(() => setRemoteStatus('saved'))
        .catch(() => setRemoteStatus('error'));
    }, 1200);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [proposal, remoteId, loadingRemote]);

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

  const reset = useCallback(() => setProposal(structuredClone(EMPTY_PROPOSAL)), []);

  const publishRemote = useCallback(async () => {
    setRemoteStatus('saving');
    try {
      const { id } = await saveProposal(proposal, remoteId || undefined);
      setRemoteId(id);
      localStorage.setItem(ID_STORAGE_KEY, id);
      // Push id into URL so bookmarks preserve it, without a full navigation.
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('id', id);
        window.history.replaceState({}, '', u.toString());
      } catch {
        // ignore
      }
      setRemoteStatus('saved');
      return id;
    } catch (e) {
      setRemoteStatus('error');
      throw e;
    }
  }, [proposal, remoteId]);

  return {
    proposal,
    setProposal,
    updateSection,
    updateModule,
    addModule,
    removeModule,
    reset,
    remoteId,
    remoteStatus,
    publishRemote,
    loadingRemote,
  };
}
