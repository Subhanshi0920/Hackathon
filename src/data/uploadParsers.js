// ---------------------------------------------------------------------------
// uploadParsers.js — reads a user-uploaded GSTR-1, GSTR-3B, or bank
// statement file (.csv or .xlsx) ENTIRELY IN THE BROWSER and turns it into
// the same document shape calculations.js already expects.
//
// No backend involved: for real .xlsx/.xls files, SheetJS (the 'xlsx'
// package) parses the binary workbook directly in JS. For .csv, we parse
// it ourselves (see parseCsvText below) rather than handing it to SheetJS —
// SheetJS silently auto-detects date-LOOKING text (e.g. a "period" column
// containing "2025-03") and converts it into a JS Date object, which
// corrupted exactly the field the cash-flow model keys off. Real .xlsx
// files don't have this problem the same way: a spreadsheet cell is only a
// Date if it was actually stored as one, not guessed from text patterns.
// ---------------------------------------------------------------------------

import * as XLSX from "xlsx";

class UploadValidationError extends Error {}

function toDateStringOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

// For columns that must stay plain text (period, label, buyerName) even if
// a spreadsheet cell happens to carry a real Date type — e.g. Excel
// sometimes auto-formats "2025-03" as a date if the column isn't
// explicitly set to Text.
function toPlainTextOrEmpty(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  return String(value).trim();
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Minimal RFC4180-ish CSV line splitter: handles quoted fields containing commas. */
function splitCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

/** Parses raw CSV text ourselves — no SheetJS involved (see file header comment). */
function parseCsvText(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new UploadValidationError(
      "The file has a header row but no data rows.",
    );
  }
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      const raw = cells[i];
      row[h] = raw === undefined || raw === "" ? null : raw.trim();
    });
    return row;
  });
}

/**
 * Reads any supported file into an array of row objects keyed by header.
 * .csv is parsed manually. Real .xlsx/.xls workbooks go through SheetJS.
 */
async function readRows(file) {
  const isCsv = /\.csv$/i.test(file.name);

  if (isCsv) {
    const text = await file.text();
    return parseCsvText(text);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName)
    throw new UploadValidationError("The file doesn't contain any sheet/data.");
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  if (rows.length === 0)
    throw new UploadValidationError(
      "The file has a header row but no data rows.",
    );
  return rows;
}

function assertRequiredColumns(rows, required, fileLabel) {
  const actualColumns = new Set(Object.keys(rows[0]).map((k) => k.trim()));
  const missing = required.filter((col) => !actualColumns.has(col));
  if (missing.length > 0) {
    throw new UploadValidationError(
      `${fileLabel} is missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. ` +
        `Download the template to see the exact columns expected.`,
    );
  }
}

// ---------------------------------------------------------------------------
// GSTR-1 buyer upload -> gstr1Buyers.json shape
// ---------------------------------------------------------------------------

const GSTR1_REQUIRED_COLUMNS = ["buyerName", "valueLakhs"];

export async function parseGstr1File(file) {
  const rows = await readRows(file);
  assertRequiredColumns(rows, GSTR1_REQUIRED_COLUMNS, "GSTR-1 buyer file");

  const topBuyers = rows
    .map((row, i) => {
      if (!row.buyerName) {
        throw new UploadValidationError(
          `Row ${i + 2}: buyerName cannot be blank.`,
        );
      }
      return {
        buyerGstin: toPlainTextOrEmpty(row.buyerGstin) || null,
        buyerName: toPlainTextOrEmpty(row.buyerName),
        valueLakhs: toNumber(row.valueLakhs),
        invoiceCount: toNumber(row.invoiceCount, 0),
      };
    })
    // The rest of the app assumes topBuyers[0] is the single largest buyer.
    .sort((a, b) => b.valueLakhs - a.valueLakhs);

  if (topBuyers.length === 0) {
    throw new UploadValidationError("No buyer rows found.");
  }

  return {
    source: "User upload",
    fetchedAt: new Date().toISOString(),
    topBuyers,
  };
}

// ---------------------------------------------------------------------------
// GSTR-3B filing upload -> gstr3bReturns.json shape
// ---------------------------------------------------------------------------

const GST_REQUIRED_COLUMNS = [
  "period",
  "label",
  "dueDate",
  "taxableTurnoverLakhs",
];

export async function parseGstFile(file) {
  const rows = await readRows(file);
  assertRequiredColumns(rows, GST_REQUIRED_COLUMNS, "GSTR-3B filing file");

  const returns = rows.map((row, i) => {
    if (!row.period || !row.label || !row.dueDate) {
      throw new UploadValidationError(
        `Row ${i + 2}: period, label, and dueDate cannot be blank.`,
      );
    }
    return {
      period: toPlainTextOrEmpty(row.period),
      label: toPlainTextOrEmpty(row.label),
      dueDate: toDateStringOrNull(row.dueDate),
      filingDate: toDateStringOrNull(row.filingDate), // blank = missed filing
      taxableTurnoverLakhs: toNumber(row.taxableTurnoverLakhs),
      outputTaxLakhs: toNumber(row.outputTaxLakhs, 0),
      inputTaxCreditLakhs: toNumber(row.inputTaxCreditLakhs, 0),
      taxPaidLakhs: toNumber(row.taxPaidLakhs, 0),
      paidDate: toDateStringOrNull(row.paidDate),
    };
  });

  return {
    source: "User upload",
    fetchedAt: new Date().toISOString(),
    returns,
    // previousFinancialYear isn't part of the monthly upload — see
    // DataContext.jsx for how it's merged in from whatever was there before.
  };
}

// ---------------------------------------------------------------------------
// Bank statement upload -> bankTransactions.json shape
// ---------------------------------------------------------------------------

const BANK_REQUIRED_COLUMNS = [
  "period",
  "label",
  "customerReceiptsLakhs",
  "totalOutflowsLakhs",
];

export async function parseBankFile(file) {
  const rows = await readRows(file);
  assertRequiredColumns(rows, BANK_REQUIRED_COLUMNS, "Bank statement file");

  const monthly = rows.map((row, i) => {
    if (!row.period || !row.label) {
      throw new UploadValidationError(
        `Row ${i + 2}: period and label cannot be blank.`,
      );
    }
    return {
      period: toPlainTextOrEmpty(row.period),
      label: toPlainTextOrEmpty(row.label),
      customerReceiptsLakhs: toNumber(row.customerReceiptsLakhs),
      otherInflowsLakhs: toNumber(row.otherInflowsLakhs, 0),
      totalOutflowsLakhs: toNumber(row.totalOutflowsLakhs),
    };
  });

  return {
    source: "User upload",
    fetchedAt: new Date().toISOString(),
    monthly,
  };
}

// ---------------------------------------------------------------------------
// Offline sales upload -> offlineSales.json shape
//
// This is a GST-vs-actual sales reconciliation export (bank/UPI/card
// receipts, POS cash, cash book, cash deposits, etc.) rather than a single
// "offline sales" figure, so it's keyed by month like the other uploads but
// carries many more reconciliation columns per row.
// ---------------------------------------------------------------------------

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Derives a short month label ("Apr") from a "YYYY-MM" period string. */
function deriveMonthLabel(period) {
  const match = /^\d{4}-(\d{2})$/.exec(period);
  if (!match) return period;
  return MONTH_LABELS[Number(match[1]) - 1] ?? period;
}

const OFFLINE_SALES_REQUIRED_COLUMNS = [
  "business_name",
  "month",
  "gst_reported_sales",
  "digital_sales_bank_upi_card",
  "pos_cash_sales",
  "gst_total_sales_reconciled",
  "cash_book_sales",
  "cash_deposits",
  "accounting_cash_sales",
];

export async function parseOfflineSalesFile(file) {
  const rows = await readRows(file);
  assertRequiredColumns(rows, OFFLINE_SALES_REQUIRED_COLUMNS, "Offline sales file");

  const monthly = rows.map((row, i) => {
    if (!row.business_name || !row.month) {
      throw new UploadValidationError(
        `Row ${i + 2}: business_name and month cannot be blank.`,
      );
    }
    const period = toPlainTextOrEmpty(row.month);
    return {
      businessName: toPlainTextOrEmpty(row.business_name),
      period,
      label: deriveMonthLabel(period),
      gstReportedSales: toNumber(row.gst_reported_sales),
      digitalSalesBankUpiCard: toNumber(row.digital_sales_bank_upi_card),
      posCashSales: toNumber(row.pos_cash_sales),
      otherUnobservedSales: toNumber(row.other_unobserved_sales, 0),
      gstTotalSalesReconciled: toNumber(row.gst_total_sales_reconciled),
      cashBookSales: toNumber(row.cash_book_sales),
      cashDeposits: toNumber(row.cash_deposits),
      accountingCashSales: toNumber(row.accounting_cash_sales),
      confidence: toPlainTextOrEmpty(row.confidence) || "Unknown",
    };
  });

  return {
    source: "User upload",
    fetchedAt: new Date().toISOString(),
    monthly,
  };
}

export { UploadValidationError, readRows };

// ---------------------------------------------------------------------------
// Downloadable templates, so a user knows exactly what columns are expected.
// ---------------------------------------------------------------------------

function downloadCsv(filename, headerRow, ...dataRows) {
  const csv = [headerRow, ...dataRows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadGstr1Template() {
  downloadCsv(
    "gstr1-buyer-template.csv",
    ["buyerGstin", "buyerName", "valueLakhs", "invoiceCount"],
    ["07AAECS4321G1Z8", "Example Buyer Pvt Ltd", "20", "28"],
  );
}

const GST_MONTHS = [
  [
    "2024-04",
    "Apr",
    "2024-05-20",
    "2024-05-18",
    "7.6",
    "1.37",
    "0.80",
    "0.57",
    "2024-05-18",
  ],
  [
    "2024-05",
    "May",
    "2024-06-20",
    "2024-06-19",
    "8.1",
    "1.46",
    "0.83",
    "0.63",
    "2024-06-19",
  ],
  [
    "2024-06",
    "Jun",
    "2024-07-20",
    "2024-07-17",
    "8.4",
    "1.51",
    "0.88",
    "0.63",
    "2024-07-17",
  ],
  [
    "2024-07",
    "Jul",
    "2024-08-20",
    "2024-08-20",
    "7.9",
    "1.42",
    "0.81",
    "0.61",
    "2024-08-20",
  ],
  [
    "2024-08",
    "Aug",
    "2024-09-20",
    "2024-09-16",
    "8.6",
    "1.55",
    "0.90",
    "0.65",
    "2024-09-16",
  ],
  [
    "2024-09",
    "Sep",
    "2024-10-20",
    "2024-10-18",
    "9.0",
    "1.62",
    "0.94",
    "0.68",
    "2024-10-18",
  ],
  [
    "2024-10",
    "Oct",
    "2024-11-20",
    "2024-11-19",
    "9.5",
    "1.71",
    "0.99",
    "0.72",
    "2024-11-19",
  ],
  [
    "2024-11",
    "Nov",
    "2024-12-20",
    "2024-12-17",
    "8.8",
    "1.58",
    "0.92",
    "0.66",
    "2024-12-17",
  ],
  [
    "2024-12",
    "Dec",
    "2025-01-20",
    "2025-01-20",
    "9.2",
    "1.66",
    "0.95",
    "0.71",
    "2025-01-20",
  ],
  [
    "2025-01",
    "Jan",
    "2025-02-20",
    "2025-02-18",
    "8.3",
    "1.49",
    "0.86",
    "0.63",
    "2025-02-18",
  ],
  [
    "2025-02",
    "Feb",
    "2025-03-20",
    "2025-03-19",
    "8.0",
    "1.44",
    "0.82",
    "0.62",
    "2025-03-19",
  ],
  [
    "2025-03",
    "Mar",
    "2025-04-20",
    "2025-04-18",
    "8.2",
    "1.48",
    "0.85",
    "0.63",
    "2025-04-18",
  ],
];

const BANK_MONTHS = [
  ["2024-04", "Apr", "7.1", "0.2", "5.4"],
  ["2024-05", "May", "7.6", "0.3", "5.8"],
  ["2024-06", "Jun", "7.9", "0.2", "6.0"],
  ["2024-07", "Jul", "7.4", "0.4", "5.7"],
  ["2024-08", "Aug", "8.0", "0.2", "6.1"],
  ["2024-09", "Sep", "8.4", "0.3", "6.3"],
  ["2024-10", "Oct", "8.9", "0.3", "6.6"],
  ["2024-11", "Nov", "8.2", "0.2", "6.2"],
  ["2024-12", "Dec", "8.6", "0.4", "6.5"],
  ["2025-01", "Jan", "7.8", "0.2", "5.9"],
  ["2025-02", "Feb", "7.5", "0.3", "5.8"],
  ["2025-03", "Mar", "7.7", "0.3", "5.9"],
];

export function downloadGstTemplate() {
  downloadCsv(
    "gstr3b-filing-template.csv",
    [
      "period",
      "label",
      "dueDate",
      "filingDate",
      "taxableTurnoverLakhs",
      "outputTaxLakhs",
      "inputTaxCreditLakhs",
      "taxPaidLakhs",
      "paidDate",
    ],
    ...GST_MONTHS,
  );
}

export function downloadBankTemplate() {
  downloadCsv(
    "bank-statement-template.csv",
    [
      "period",
      "label",
      "customerReceiptsLakhs",
      "otherInflowsLakhs",
      "totalOutflowsLakhs",
    ],
    ...BANK_MONTHS,
  );
}

const OFFLINE_SALES_MONTHS = [
  ["ABC Traders", "2026-04", "1000000", "620000", "330000", "50000", "980000", "320000", "300000", "310000", "High"],
  ["ABC Traders", "2026-05", "1050000", "650000", "350000", "50000", "1020000", "340000", "315000", "325000", "High"],
  ["ABC Traders", "2026-06", "1100000", "680000", "370000", "50000", "1080000", "360000", "340000", "350000", "High"],
  ["ABC Traders", "2026-07", "1150000", "710000", "390000", "50000", "1120000", "380000", "360000", "370000", "High"],
  ["ABC Traders", "2026-08", "1180000", "730000", "400000", "50000", "1160000", "395000", "375000", "390000", "High"],
];

export function downloadOfflineSalesTemplate() {
  downloadCsv(
    "offline-sales-template.csv",
    [
      "business_name",
      "month",
      "gst_reported_sales",
      "digital_sales_bank_upi_card",
      "pos_cash_sales",
      "other_unobserved_sales",
      "gst_total_sales_reconciled",
      "cash_book_sales",
      "cash_deposits",
      "accounting_cash_sales",
      "confidence",
    ],
    ...OFFLINE_SALES_MONTHS,
  );
}
