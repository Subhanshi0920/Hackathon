// ---------------------------------------------------------------------------
// defaultDocuments.js — the bundled demo dataset, used until the user
// uploads their own GSTR-1 / GSTR-3B / bank statement files (or after they
// hit "Reset to demo data"). Untouched from the original documents/*.json.
// ---------------------------------------------------------------------------

import gstr3b from "./documents/gstr3bReturns.json" with { type: "json" };
import gstr1 from "./documents/gstr1Buyers.json" with { type: "json" };
import bankTransactions from "./documents/bankTransactions.json" with { type: "json" };

// Offline cash sales (bills) is optional and defaults to "none reported" —
// the bundled default business has no cash-heavy retail component, so this
// stays empty until a business uploads its own (see uploadParsers.js).
const cashSales = { source: "No cash sales uploaded", fetchedAt: null, monthly: [] };

export const DEFAULT_DOCUMENTS = {
  gstr3b,
  gstr1,
  bankTransactions,
  cashSales,
};