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
  // gstr1, gstr3b, bankTransactions, and cashSales are the four documents
  // this app lets the user replace via upload. cashSales (offline bills) is
  // the only optional one — see uploadParsers.js for why it exists.
  const [gstr1, setGstr1] = useState(DEFAULT_DOCUMENTS.gstr1);
  const [gstr3b, setGstr3b] = useState(DEFAULT_DOCUMENTS.gstr3b);
  const [bankTransactions, setBankTransactions] = useState(DEFAULT_DOCUMENTS.bankTransactions);
  const [cashSales, setCashSales] = useState(DEFAULT_DOCUMENTS.cashSales);

  // Track upload provenance so the UI can show "using uploaded file" vs "using demo data".
  const [gstr1Source, setGstr1Source] = useState({ kind: "demo", fileName: null });
  const [gstSource, setGstSource] = useState({ kind: "demo", fileName: null });
  const [bankSource, setBankSource] = useState({ kind: "demo", fileName: null });
  const [cashSalesSource, setCashSalesSource] = useState({ kind: "none", fileName: null });

  const documents = useMemo(
    () => ({ gstr1, gstr3b, bankTransactions, cashSales }),
    [gstr1, gstr3b, bankTransactions, cashSales]
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

  const setCashSalesDocument = useCallback((doc, fileName) => {
    setCashSales(doc);
    setCashSalesSource({ kind: "uploaded", fileName });
  }, []);

  const resetCashSalesDocument = useCallback(() => {
    setCashSales(DEFAULT_DOCUMENTS.cashSales);
    setCashSalesSource({ kind: "none", fileName: null });
  }, []);

  const value = useMemo(
    () => ({
      ...calc,
      gstr1Source,
      gstSource,
      bankSource,
      cashSalesSource,
      setGstr1Document,
      setGstDocument,
      setBankDocument,
      setCashSalesDocument,
      resetGstr1Document,
      resetGstDocument,
      resetBankDocument,
      resetCashSalesDocument,
    }),
    [
      calc,
      gstr1Source,
      gstSource,
      bankSource,
      cashSalesSource,
      setGstr1Document,
      setGstDocument,
      setBankDocument,
      setCashSalesDocument,
      resetGstr1Document,
      resetGstDocument,
      resetBankDocument,
      resetCashSalesDocument,
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