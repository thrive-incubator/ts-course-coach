import { useCallback, useEffect, useState } from 'react';
import { EMPTY_PROPOSAL, type Proposal } from '../types/proposal';

const STORAGE_KEY = 'ts-course-coach:proposal:v1';

function load(): Proposal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(EMPTY_PROPOSAL);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(EMPTY_PROPOSAL), ...parsed };
  } catch {
    return structuredClone(EMPTY_PROPOSAL);
  }
}

export function useProposal() {
  const [proposal, setProposal] = useState<Proposal>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proposal));
    } catch {
      // storage full or blocked; ignore
    }
  }, [proposal]);

  const updateSection = useCallback(
    <K extends keyof Proposal>(section: K, patch: Partial<Proposal[K]>) => {
      setProposal((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));
    },
    []
  );

  const reset = useCallback(() => setProposal(structuredClone(EMPTY_PROPOSAL)), []);

  return { proposal, setProposal, updateSection, reset };
}
