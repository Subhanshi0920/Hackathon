// ---------------------------------------------------------------------------
// riskUploadParsers.js — file upload for the *document-backed* risk factors:
// ITR, balance sheet, provisional B/S, and bank conduct. The rest (CIBIL,
// GST standing, ownership, location, reputation) are typed into the form —
// see profileForm.js.
//
// Each parser turns an uploaded CSV/Excel into the matching section of a
// business risk profile, which DataContext merges over the demo profile so
// RiskFactorsCard / OverviewSummary re-score live.
//   - "object" factors -> CSV with `field,value` rows
//   - "list"   factors -> a normal table, one row per record
// ---------------------------------------------------------------------------

import { readRows, UploadValidationError } from "./uploadParsers.js";

const isBoolish = (v) => /^(true|false|yes|no)$/i.test(String(v).trim());
const asBool = (v) => /^(true|yes)$/i.test(String(v).trim());
const asNum = (v) => Number(String(v).trim());

/** `field,value` rows -> a plain object, auto-coercing booleans and numbers. */
function kvObject(rows) {
  const out = {};
  for (const r of rows) {
    if (!r.field) continue;
    const key = String(r.field).trim();
    const raw = r.value == null ? "" : String(r.value).trim();
    if (isBoolish(raw)) out[key] = asBool(raw);
    else if (raw !== "" && Number.isFinite(Number(raw))) out[key] = Number(raw);
    else out[key] = raw;
  }
  return out;
}

export const RISK_FACTORS = {
  itr: {
    label: "ITR Track Record",
    section: "itr",
    kind: "list",
    map: (r) => ({
      financialYear: String(r.financialYear || "").trim(),
      grossTotalIncomeLakhs: asNum(r.grossTotalIncomeLakhs),
      taxPaidLakhs: asNum(r.taxPaidLakhs),
      filedOnTime: asBool(r.filedOnTime),
    }),
    template: [
      ["financialYear", "grossTotalIncomeLakhs", "taxPaidLakhs", "filedOnTime"],
      ["2023-24", "120", "14.2", "Yes"],
      ["2024-25", "138", "16.8", "Yes"],
    ],
  },
  balanceSheet: {
    label: "Balance Sheet (audited)",
    section: "balanceSheet",
    kind: "object",
    template: [
      ["field", "value"],
      ["financialYear", "2024-25"],
      ["totalAssetsLakhs", "210"],
      ["totalLiabilitiesLakhs", "120"],
      ["netWorthLakhs", "90"],
      ["currentAssetsLakhs", "110"],
      ["currentLiabilitiesLakhs", "70"],
      ["totalDebtLakhs", "75"],
    ],
  },
  provisionalBalanceSheet: {
    label: "Provisional B/S",
    section: "provisionalBalanceSheet",
    kind: "object",
    template: [
      ["field", "value"],
      ["financialYear", "2025-26 (Provisional, H1)"],
      ["totalAssetsLakhs", "228"],
      ["totalLiabilitiesLakhs", "124"],
      ["netWorthLakhs", "104"],
      ["currentAssetsLakhs", "121"],
      ["currentLiabilitiesLakhs", "72"],
      ["totalDebtLakhs", "72"],
    ],
  },
  bankAccounts: {
    label: "Bank Conduct",
    section: "bankAccounts",
    kind: "list",
    map: (r) => ({
      bankName: String(r.bankName || "").trim(),
      accountType: String(r.accountType || "Current").trim(),
      accountAgeYears: asNum(r.accountAgeYears),
      avgMonthlyBalanceLakhs: asNum(r.avgMonthlyBalanceLakhs),
      bounceCountLast12Months: asNum(r.bounceCountLast12Months),
    }),
    template: [
      [
        "bankName",
        "accountType",
        "accountAgeYears",
        "avgMonthlyBalanceLakhs",
        "bounceCountLast12Months",
      ],
      ["HDFC Bank", "Current", "5.4", "12.1", "0"],
    ],
  },
};

/** factorKey -> profile section key. */
export const RISK_FACTOR_SECTION = Object.fromEntries(
  Object.entries(RISK_FACTORS).map(([k, s]) => [k, s.section]),
);

/** Parse one uploaded risk-factor file into its profile section value. */
export async function parseRiskFactorFile(factorKey, file) {
  const spec = RISK_FACTORS[factorKey];
  if (!spec)
    throw new UploadValidationError(`Unknown risk factor: ${factorKey}`);

  const rows = await readRows(file);
  if (rows.length === 0) {
    throw new UploadValidationError("The file has no data rows.");
  }

  if (spec.kind === "object") return kvObject(rows);
  if (spec.kind === "list") {
    const mapped = rows
      .map(spec.map)
      .filter((r) => r.financialYear || r.bankName);
    if (mapped.length === 0) {
      throw new UploadValidationError(
        "No usable rows found — check the columns.",
      );
    }
    return mapped;
  }
  throw new UploadValidationError(`Unhandled factor kind: ${spec.kind}`);
}

/** Download the CSV template for one risk factor. */
export function downloadRiskTemplate(factorKey) {
  const spec = RISK_FACTORS[factorKey];
  if (!spec) return;
  const csv = spec.template.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${factorKey}-template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
