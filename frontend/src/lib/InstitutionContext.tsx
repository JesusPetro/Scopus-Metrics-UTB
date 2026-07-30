import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Institution } from "./types";

const STORAGE_KEY = "utb-research-analytics:institution";

interface InstitutionContextValue {
  institutions: Institution[];
  /** Loading until the institutions list resolves and a default is picked. */
  ready: boolean;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
}

const InstitutionContext = createContext<InstitutionContextValue | null>(null);

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .institutions()
      .then((data) => {
        if (cancelled) return;
        setInstitutions(data);
        const stored = localStorage.getItem(STORAGE_KEY);
        const fallback = data.find((i) => i.isDefault)?.id ?? data[0]?.id ?? null;
        setSelectedIdState(stored && data.some((i) => i.id === stored) ? stored : fallback);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setSelectedId(id: string) {
    setSelectedIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const value = useMemo(
    () => ({ institutions, ready, selectedId, setSelectedId }),
    [institutions, ready, selectedId]
  );

  return <InstitutionContext.Provider value={value}>{children}</InstitutionContext.Provider>;
}

export function useInstitution() {
  const ctx = useContext(InstitutionContext);
  if (!ctx) throw new Error("useInstitution must be used within an InstitutionProvider");
  return ctx;
}
