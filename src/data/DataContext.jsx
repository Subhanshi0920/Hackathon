// ---------------------------------------------------------------------------
// DataContext.jsx — the single source of truth for "which GST/bank
// documents are currently loaded" and "what do they calculate to."
//
// Every component reads from useAppData() instead of importing
// calculations.js directly, so submitting an uploaded file (see
// DataUploadCard.jsx) re-renders the entire dashboard automatically.
// ---------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import { buildCalculations } from "./calculations.js";
import { BORROWERS } from "./calculations.js";
import { DEFAULT_DOCUMENTS } from "./defaultDocuments.js";
import { getBusinessRiskProfileByGstin } from "./bankFactors.js";
import { EMPTY_FORM, formToSections } from "./profileForm.js";
import { RISK_FACTOR_SECTION } from "./riskUploadParsers.js";

/** Shallow-merge a form section over the demo one; arrays replace wholesale. */
function mergeSection(base, incoming) {
  if (Array.isArray(incoming)) return incoming;
  if (incoming && typeof incoming === "object") return { ...base, ...incoming };
  return incoming;
}

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  // gstr1, gstr3b, and bankTransactions are the three documents this app
  // lets the user replace via upload.
  const [gstr1, setGstr1] = useState(DEFAULT_DOCUMENTS.gstr1);
  const [gstr3b, setGstr3b] = useState(DEFAULT_DOCUMENTS.gstr3b);
  const [bankTransactions, setBankTransactions] = useState(
    DEFAULT_DOCUMENTS.bankTransactions,
  );

  // Track upload provenance so the UI can show "using uploaded file" vs "using demo data".
  const [gstr1Source, setGstr1Source] = useState({
    kind: "demo",
    fileName: null,
  });
  const [gstSource, setGstSource] = useState({ kind: "demo", fileName: null });
  const [bankSource, setBankSource] = useState({
    kind: "demo",
    fileName: null,
  });

  const documents = useMemo(
    () => ({ gstr1, gstr3b, bankTransactions }),
    [gstr1, gstr3b, bankTransactions],
  );

  // Recompute every calculation only when the underlying documents change,
  // not on every render.
  const calc = useMemo(() => buildCalculations(documents), [documents]);

  const setGstr1Document = useCallback((doc, fileName) => {
    setGstr1(doc);
    setGstr1Source({ kind: "uploaded", fileName });
  }, []);

  const setGstDocument = useCallback((doc, fileName) => {
    // previousFinancialYear is a single reference number, not a per-row
    // figure in the upload — carry it forward from whatever was loaded
    // before, so YoY growth still has something to compare against.
    setGstr3b((prev) => ({
      ...doc,
      previousFinancialYear: prev.previousFinancialYear,
    }));
    setGstSource({ kind: "uploaded", fileName });
  }, []);

  const setBankDocument = useCallback((doc, fileName) => {
    setBankTransactions(doc);
    setBankSource({ kind: "uploaded", fileName });
  }, []);

  const resetGstr1Document = useCallback(() => {
    setGstr1(DEFAULT_DOCUMENTS.gstr1);
    setGstr1Source({ kind: "demo", fileName: null });
  }, []);

  const resetGstDocument = useCallback(() => {
    setGstr3b(DEFAULT_DOCUMENTS.gstr3b);
    setGstSource({ kind: "demo", fileName: null });
  }, []);

  const resetBankDocument = useCallback(() => {
    setBankTransactions(DEFAULT_DOCUMENTS.bankTransactions);
    setBankSource({ kind: "demo", fileName: null });
  }, []);

  // ---- Business profile form ---------------------------------------------
  // A handful of typed inputs (see profileForm.js) that override sections of
  // the risk profile — replaces uploading a dozen CSVs. Single onboarding
  // business, not per-GSTIN.
  const [profileForm, setProfileForm] = useState(EMPTY_FORM);
  const demoRiskProfile = useMemo(
    () => getBusinessRiskProfileByGstin(BORROWERS[0]?.gstin),
    [],
  );

  const updateProfileForm = useCallback((patch) => {
    setProfileForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetProfileForm = useCallback(() => setProfileForm(EMPTY_FORM), []);

  // ---- Document-backed factor uploads (ITR, balance sheets, bank conduct) --
  const [riskDocOverrides, setRiskDocOverrides] = useState({}); // { [section]: value }
  const [riskDocStatus, setRiskDocStatus] = useState({}); // { [factorKey]: fileName }

  const applyRiskDoc = useCallback((factorKey, value, fileName) => {
    const section = RISK_FACTOR_SECTION[factorKey];
    if (!section) return;
    setRiskDocOverrides((prev) => ({ ...prev, [section]: value }));
    setRiskDocStatus((prev) => ({ ...prev, [factorKey]: fileName }));
  }, []);

  const clearRiskDoc = useCallback((factorKey) => {
    const section = RISK_FACTOR_SECTION[factorKey];
    if (!section) return;
    setRiskDocOverrides((prev) => {
      const next = { ...prev };
      delete next[section];
      return next;
    });
    setRiskDocStatus((prev) => {
      const next = { ...prev };
      delete next[factorKey];
      return next;
    });
  }, []);

  const getRiskProfile = useCallback(
    (gstin) => {
      const base = getBusinessRiskProfileByGstin(gstin);
      if (!base) return null;
      const overrides = {
        ...formToSections(profileForm, base),
        ...riskDocOverrides,
      };
      const keys = Object.keys(overrides);
      if (keys.length === 0) return base;
      const merged = { ...base };
      for (const section of keys) {
        merged[section] = mergeSection(base[section], overrides[section]);
      }
      return merged;
    },
    [profileForm, riskDocOverrides],
  );

  const value = useMemo(
    () => ({
      ...calc,
      gstr1Source,
      gstSource,
      bankSource,
      setGstr1Document,
      setGstDocument,
      setBankDocument,
      resetGstr1Document,
      resetGstDocument,
      resetBankDocument,
      profileForm,
      updateProfileForm,
      resetProfileForm,
      getRiskProfile,
      demoRiskProfile,
      riskDocStatus,
      applyRiskDoc,
      clearRiskDoc,
    }),
    [
      calc,
      gstr1Source,
      gstSource,
      bankSource,
      setGstr1Document,
      setGstDocument,
      setBankDocument,
      resetGstr1Document,
      resetGstDocument,
      resetBankDocument,
      profileForm,
      updateProfileForm,
      resetProfileForm,
      getRiskProfile,
      demoRiskProfile,
      riskDocStatus,
      applyRiskDoc,
      clearRiskDoc,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

/** The only hook components should use to read calculated data or trigger an upload. */
export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}
