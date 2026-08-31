// ---------------------------------------------------------------------------
// DataContext.jsx — the single source of truth for "which GST/bank
// documents are currently loaded" and "what do they calculate to."
//
// Every component reads from useAppData() instead of importing
// calculations.js directly, so submitting an uploaded file (see
// DataUploadCard.jsx) re-renders the entire dashboard automatically.
// ---------------------------------------------------------------------------

import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { buildCalculations } from "./calculations.js";
import { DEFAULT_DOCUMENTS } from "./defaultDocuments.js";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  // gstr1, gstr3b, and bankTransactions are the three documents this app
  // lets the user replace via upload.
  const [gstr1, setGstr1] = useState(DEFAULT_DOCUMENTS.gstr1);
  const [gstr3b, setGstr3b] = useState(DEFAULT_DOCUMENTS.gstr3b);
  const [bankTransactions, setBankTransactions] = useState(DEFAULT_DOCUMENTS.bankTransactions);

  // Track upload provenance so the UI can show "using uploaded file" vs "using demo data".
  const [gstr1Source, setGstr1Source] = useState({ kind: "demo", fileName: null });
  const [gstSource, setGstSource] = useState({ kind: "demo", fileName: null });
  const [bankSource, setBankSource] = useState({ kind: "demo", fileName: null });

  const documents = useMemo(
    () => ({ gstr1, gstr3b, bankTransactions }),
    [gstr1, gstr3b, bankTransactions]
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
    setGstr3b((prev) => ({ ...doc, previousFinancialYear: prev.previousFinancialYear }));
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
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

/** The only hook components should use to read calculated data or trigger an upload. */
export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}