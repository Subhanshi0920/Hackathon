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
    throw new UploadValidationError("The file has a header row but no data rows.");
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
  if (!firstSheetName) throw new UploadValidationError("The file doesn't contain any sheet/data.");
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  if (rows.length === 0) throw new UploadValidationError("The file has a header row but no data rows.");
  return rows;
}

function assertRequiredColumns(rows, required, fileLabel) {
  const actualColumns = new Set(Object.keys(rows[0]).map((k) => k.trim()));
  const missing = required.filter((col) => !actualColumns.has(col));
  if (missing.length > 0) {
    throw new UploadValidationError(
      `${fileLabel} is missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. ` +
        `Download the template to see the exact columns expected.`
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
        throw new UploadValidationError(`Row ${i + 2}: buyerName cannot be blank.`);
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

const GST_REQUIRED_COLUMNS = ["period", "label", "dueDate", "taxableTurnoverLakhs"];

export async function parseGstFile(file) {
  const rows = await readRows(file);
  assertRequiredColumns(rows, GST_REQUIRED_COLUMNS, "GSTR-3B filing file");

  const returns = rows.map((row, i) => {
    if (!row.period || !row.label || !row.dueDate) {
      throw new UploadValidationError(`Row ${i + 2}: period, label, and dueDate cannot be blank.`);
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

const BANK_REQUIRED_COLUMNS = ["period", "label", "customerReceiptsLakhs", "totalOutflowsLakhs"];

export async function parseBankFile(file) {
  const rows = await readRows(file);
  assertRequiredColumns(rows, BANK_REQUIRED_COLUMNS, "Bank statement file");

  const monthly = rows.map((row, i) => {
    if (!row.period || !row.label) {
      throw new UploadValidationError(`Row ${i + 2}: period and label cannot be blank.`);
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

export { UploadValidationError };

// ---------------------------------------------------------------------------
// Downloadable templates, so a user knows exactly what columns are expected.
// ---------------------------------------------------------------------------

function downloadCsv(filename, headerRow, exampleRow) {
  const csv = [headerRow.join(","), exampleRow.join(",")].join("\n");
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
    ["07AAECS4321G1Z8", "Example Buyer Pvt Ltd", "20", "28"]
  );
}

export function downloadGstTemplate() {
  downloadCsv(
    "gstr3b-filing-template.csv",
    ["period", "label", "dueDate", "filingDate", "taxableTurnoverLakhs", "outputTaxLakhs", "inputTaxCreditLakhs", "taxPaidLakhs", "paidDate"],
    ["2025-03", "Mar", "2025-04-20", "2025-04-18", "8.2", "1.48", "0.85", "0.63", "2025-04-18"]
  );
}

export function downloadBankTemplate() {
  downloadCsv(
    "bank-statement-template.csv",
    ["period", "label", "customerReceiptsLakhs", "otherInflowsLakhs", "totalOutflowsLakhs"],
    ["2025-03", "Mar", "7.5", "0.3", "5.7"]
  );
}