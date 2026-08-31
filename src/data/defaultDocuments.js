// ---------------------------------------------------------------------------
// defaultDocuments.js — the bundled demo dataset, used until the user
// uploads their own GSTR-1 / GSTR-3B / bank statement files (or after they
// hit "Reset to demo data"). Untouched from the original documents/*.json.
// ---------------------------------------------------------------------------

import gstr3b from "./documents/gstr3bReturns.json";
import gstr1 from "./documents/gstr1Buyers.json";
import bankTransactions from "./documents/bankTransactions.json";

export const DEFAULT_DOCUMENTS = {
  gstr3b,
  gstr1,
  bankTransactions,
};