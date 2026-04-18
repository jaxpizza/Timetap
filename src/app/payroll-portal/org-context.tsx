"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface PortalOrg {
  id: string;
  name: string;
}

interface OrgContextValue {
  orgs: PortalOrg[];
  selectedOrgId: string | null;
  selectedOrg: PortalOrg | null;
  setOrg: (id: string) => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

const STORAGE_KEY = "tt.payroll-portal.selectedOrgId";

export function OrgProvider({ orgs, initialOrgId, children }: { orgs: PortalOrg[]; initialOrgId?: string | null; children: ReactNode }) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() => {
    if (initialOrgId) return initialOrgId;
    return null;
  });

  // Hydrate from localStorage on mount if no URL param override
  useEffect(() => {
    if (initialOrgId) {
      setSelectedOrgId(initialOrgId);
      try { localStorage.setItem(STORAGE_KEY, initialOrgId); } catch {}
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && orgs.some((o) => o.id === stored)) {
        setSelectedOrgId(stored);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrgId]);

  function setOrg(id: string) {
    setSelectedOrgId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId) ?? null;

  return (
    <OrgContext.Provider value={{ orgs, selectedOrgId, selectedOrg, setOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useSelectedOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useSelectedOrg must be used within OrgProvider");
  return ctx;
}
