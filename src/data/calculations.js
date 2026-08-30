// ---------------------------------------------------------------------------
// calculations.js — the ONLY file where numbers get derived/computed.
//
// Design principle: documents/*.json are treated as read-only, as-received
// from their source (GSTN, connected accounting software, bank feeds, the
// business's own onboarding form). Nothing in documents/ is ever computed —
// it's just what was "handed over." Every chart, score, or stat the UI shows
// is calculated here, from those documents, so there's always a clear answer
// to "where did this number come from?"
// ---------------------------------------------------------------------------

import businessProfile from "./documents/businessProfile.json";
import gstr3b from "./documents/gstr3bReturns.json";
import gstr1 from "./documents/gstr1Buyers.json";
import bankTransactions from "./documents/bankTransactions.json";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ---------------------------------------------------------------------------
// Business identity — passed through, not calculated, but exposed here so
// components have one place to import "everything about this application."
// ---------------------------------------------------------------------------

export const BORROWERS = businessProfile.map((item) => ({
  name: item.legalName,
  gstin: item.gstin,
}));


// ---------------------------------------------------------------------------
// GST filing compliance — derived from gstr3bReturns.json
// ---------------------------------------------------------------------------

/** "on" = filed on/before due date, "late" = filed after, "missed" = never filed */
function filingStatusOf(record) {
  if (!record.filingDate) return "missed";
  const due = new Date(record.dueDate).getTime();
  const filed = new Date(record.filingDate).getTime();
  return filed <= due ? "on" : "late";
}

function daysLate(record) {
  if (!record.filingDate) return null;
  const diff = (new Date(record.filingDate) - new Date(record.dueDate)) / MS_PER_DAY;
  return Math.max(0, Math.round(diff));
}

export const MONTHS = gstr3b.returns.map((r) => r.label);

export const FILING_STATUS = gstr3b.returns.map(filingStatusOf);

/** Per-month filing detail — status, how late, actual dates. Useful for tooltips/drilldowns. */
export const FILING_DETAIL = gstr3b.returns.map((r) => ({
  period: r.period,
  label: r.label,
  status: filingStatusOf(r),
  daysLate: daysLate(r),
  dueDate: r.dueDate,
  filingDate: r.filingDate,
}));

export function computeCompliancePct() {
  const onTime = gstr3b.returns.filter((r) => filingStatusOf(r) === "on").length;
  return Math.round((onTime / gstr3b.returns.length) * 100);
}

const PAID_EPSILON = 0.005; // lakh-rupee rounding tolerance

/** Net GST payable for a period: output tax less input tax credit claimed. */
function netTaxLiabilityOf(record) {
  return +(record.outputTaxLakhs - record.inputTaxCreditLakhs).toFixed(2);
}


/** What's still owed against the net liability, floored at 0. */
function outstandingTaxOf(record) {
  const net = netTaxLiabilityOf(record);
  const paid = record.taxPaidLakhs || 0;
  return +Math.max(0, net - paid).toFixed(2);
}


function paymentStatusOf(record) {
  const net = netTaxLiabilityOf(record);
  const paid = record.taxPaidLakhs || 0;

  if (paid <= PAID_EPSILON) return "Overdue";
  if (paid < net - PAID_EPSILON) return "Partially Paid";

  // Fully paid (or paid >= net, e.g. rounding) — was it on time?
  if (!record.paidDate) return "Overdue"; // fully allocated but no settlement date on record
  const due = new Date(record.dueDate).getTime();
  const paidOn = new Date(record.paidDate).getTime();
  return paidOn <= due ? "Paid" : "Paid Late";
}


function paymentDaysLate(record) {
  if (!record.paidDate) return null;
  const diff = (new Date(record.paidDate) - new Date(record.dueDate)) / MS_PER_DAY;
  return Math.max(0, Math.round(diff));
}

/** One entry per period: "Paid" | "Paid Late" | "Partially Paid" | "Overdue" */
export const PAYMENT_STATUS = gstr3b.returns.map(paymentStatusOf);

/** Per-month payment detail — status, amounts, outstanding balance, dates. */
export const PAYMENT_DETAIL = gstr3b.returns.map((r) => ({
  period: r.period,
  label: r.label,
  status: paymentStatusOf(r),
  netTaxLiabilityLakhs: netTaxLiabilityOf(r),
  taxPaidLakhs: r.taxPaidLakhs,
  outstandingTaxLakhs: outstandingTaxOf(r),
  daysLate: paymentDaysLate(r),
  dueDate: r.dueDate,
  paidDate: r.paidDate,
}));

/** % of periods that were fully paid on/before the due date ("Paid"). */
export function computePaymentCompliancePct() {
  const onTime = gstr3b.returns.filter((r) => paymentStatusOf(r) === "Paid").length;
  return Math.round((onTime / gstr3b.returns.length) * 100);
}

/** Total outstanding GST across all periods on record, in lakhs. */
export function computeTotalOutstandingTaxLakhs() {
  return +gstr3b.returns.reduce((sum, r) => sum + outstandingTaxOf(r), 0).toFixed(2);
}

// ---------------------------------------------------------------------------
// Turnover — derived from gstr3bReturns.json
// ---------------------------------------------------------------------------

export const TURNOVER = gstr3b.returns.map((r) => r.taxableTurnoverLakhs);

export function computeTotalTurnoverLakhs() {
  return +TURNOVER.reduce((sum, v) => sum + v, 0).toFixed(2);
}

export function computeAverageMonthlyTurnoverLakhs() {
  return +(computeTotalTurnoverLakhs() / TURNOVER.length).toFixed(2);
}

export function computeYoYGrowthPct() {
  const current = computeTotalTurnoverLakhs();
  const previous = gstr3b.previousFinancialYear.totalTurnoverLakhs;
  return Math.round(((current - previous) / previous) * 100);
}

// ---------------------------------------------------------------------------
// Buyer concentration — derived from gstr1Buyers.json
// A high concentration (one buyer = large % of revenue) is a lending risk
// signal: if that one buyer stops ordering, the business's cash flow breaks.
// ---------------------------------------------------------------------------

export function computeBuyerConcentration() {
  const total = computeTotalTurnoverLakhs();
  const topBuyerShare = gstr1.topBuyers[0].valueLakhs / total;
  const top5Share = gstr1.topBuyers.reduce((sum, b) => sum + b.valueLakhs, 0) / total;
  return {
    topBuyerPct: Math.round(topBuyerShare * 100),
    top5Pct: Math.round(top5Share * 100),
    topBuyerName: gstr1.topBuyers[0].buyerName,
  };
}

export const TOP_BUYERS = gstr1.topBuyers;


// ---------------------------------------------------------------------------
// Cash-flow forecast
//
// THE MODEL (Option B — calibrated collection lag + rate):
// GST turnover tells us when a sale was INVOICED. The bank feed tells us
// when money actually LANDED. The gap between those two is what a lender
// actually cares about. Instead of guessing a generic "businesses get paid
// in 45 days" assumption, we CALIBRATE it: we test a few lag values against
// this specific business's own historical turnover-vs-receipts data and
// keep whichever lag + collection rate best reproduces what actually
// happened in their bank account. That calibrated pattern is then applied
// to the months where a sale is already invoiced (GST-confirmed) but the
// bank feed hasn't reconciled actual payment yet.
//
// THE RANGE (Option D): a single predicted number is always going to be
// wrong by some amount, so instead of one forecast line we produce a
// base / best / stressed range. The stressed case specifically accounts for
// buyer concentration risk (computeBuyerConcentration, above) — if the
// single largest buyer delays payment, that's the realistic downside.
// ---------------------------------------------------------------------------

const bankMonthly = bankTransactions.monthly;

/**
 * Try a few candidate lags (in months) between "sale invoiced" and
 * "cash received." For each lag, fit a collection rate (what % of a
 * month's turnover typically shows up as receipts) using least squares,
 * then measure how well that reproduces the ACTUAL receipts on record.
 * The lag with the lowest error wins — i.e. it's discovered from data,
 * not assumed.
 */
export function calibrateCollectionModel() {
  const turnoverByPeriod = new Map(gstr3b.returns.map((r) => [r.period, r.taxableTurnoverLakhs]));
  const allPeriods = gstr3b.returns.map((r) => r.period); // chronological, "2025-03" .. "2026-02"

  function turnoverMonthsBefore(period, monthsBack) {
    const idx = allPeriods.indexOf(period);
    const targetIdx = idx - monthsBack;
    if (targetIdx >= 0) return turnoverByPeriod.get(allPeriods[targetIdx]);
    // Fall back to the prior financial year's average monthly turnover
    // for periods before our GST record window starts (e.g. Mar minus 1).
    return gstr3b.previousFinancialYear.totalTurnoverLakhs / 12;
  }

  const candidateLags = [0, 1, 2];
  let best = null;

  for (const lag of candidateLags) {
    const pairs = bankMonthly
      .map((b) => ({ turnover: turnoverMonthsBefore(b.period, lag), receipts: b.customerReceiptsLakhs }))
      .filter((p) => p.turnover != null);

    // Least-squares rate with intercept forced to 0: rate = Σ(x·y) / Σ(x²)
    const sumXY = pairs.reduce((s, p) => s + p.turnover * p.receipts, 0);
    const sumXX = pairs.reduce((s, p) => s + p.turnover * p.turnover, 0);
    const rate = sumXX > 0 ? sumXY / sumXX : 0;

    const sqError = pairs.reduce((s, p) => s + (p.receipts - p.turnover * rate) ** 2, 0);

    if (!best || sqError < best.sqError) {
      best = { lagMonths: lag, collectionRate: rate, sqError };
    }
  }

  return {
    lagMonths: best.lagMonths,
    collectionRatePct: Math.round(best.collectionRate * 100),
  };
}

function averageOf(values) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Full forecast: historical actuals from the bank feed, plus a calibrated
 * base/best/stressed range for months that are GST-invoiced but not yet
 * bank-confirmed.
 */
export function computeCashFlowForecast() {
  const { lagMonths, collectionRatePct } = calibrateCollectionModel();
  const rate = collectionRatePct / 100;
  const concentration = computeBuyerConcentration();

  const turnoverByPeriod = new Map(gstr3b.returns.map((r) => [r.period, r.taxableTurnoverLakhs]));
  const allPeriods = gstr3b.returns.map((r) => r.period);
  const bankPeriods = new Set(bankMonthly.map((b) => b.period));

  const avgOtherInflow = averageOf(bankMonthly.map((b) => b.otherInflowsLakhs));
  const avgOutflow = averageOf(bankMonthly.map((b) => b.totalOutflowsLakhs));

  const result = [];

  // Historical months — actual bank-confirmed net cash flow, no modeling needed.
  for (const b of bankMonthly) {
    const net = +(b.customerReceiptsLakhs + b.otherInflowsLakhs - b.totalOutflowsLakhs).toFixed(2);
    result.push({ period: b.period, m: b.label, actual: net, base: null, low: null, high: null });
  }

  // Forecast months — GST turnover already exists (sale invoiced), but no
  // bank confirmation yet. Apply the calibrated lag/rate model.
  for (const period of allPeriods) {
    if (bankPeriods.has(period)) continue; // already handled above as actual

    const idx = allPeriods.indexOf(period);
    const sourceIdx = idx - lagMonths;
    const sourceTurnover = sourceIdx >= 0 ? turnoverByPeriod.get(allPeriods[sourceIdx]) : null;
    if (sourceTurnover == null) continue;

    const baseInflow = sourceTurnover * rate + avgOtherInflow;
    const baseNet = +(baseInflow - avgOutflow).toFixed(2);

    // Best case: collections run ~10% better than the calibrated average (prompt payers).
    const highInflow = sourceTurnover * Math.min(rate * 1.1, 1) + avgOtherInflow;
    const highNet = +(highInflow - avgOutflow).toFixed(2);

    // Stressed case: the single largest buyer's expected share of this
    // month's receipts doesn't land at all (a real, data-backed risk —
    // this business gets ~topBuyerPct% of revenue from one customer).
    const stressedInflow = baseInflow * (1 - concentration.topBuyerPct / 100);
    const lowNet = +(stressedInflow - avgOutflow).toFixed(2);

    const label = gstr3b.returns.find((r) => r.period === period).label;
    result.push({ period, m: label, actual: null, base: baseNet, low: lowNet, high: highNet });
  }

  return result;
}

/** Convenience: the model's own summary of what it discovered, for display or the AI prompt. */
export function describeCashFlowModel() {
  const { lagMonths, collectionRatePct } = calibrateCollectionModel();
  const concentration = computeBuyerConcentration();
  return {
    lagMonths,
    collectionRatePct,
    stressAssumption: `Top buyer (${concentration.topBuyerName}) accounts for ${concentration.topBuyerPct}% of revenue — stressed case assumes their payment doesn't land that month.`,
  };
}

export const CASHFLOW = computeCashFlowForecast();

// ---------------------------------------------------------------------------
// Working capital recommendation — the actual lending decision, derived
// from the turnover, cash-flow, and concentration calculations above,
// instead of a hand-picked amount and hand-written justification.
// ---------------------------------------------------------------------------
export function computeWorkingCapitalRecommendation() {
  const avgTurnover = computeAverageMonthlyTurnoverLakhs();
  const concentration = computeBuyerConcentration();

  // Sizing: a common, simple rule of thumb — offer a facility sized to a
  // fraction of average monthly turnover, so the business can bridge a
  // typical month's gap without over-extending the bank's exposure.
  const sizingMultiple = 0.8;
  const amountLakhs = +(avgTurnover * sizingMultiple).toFixed(1);

  // Tenure: heavy reliance on one buyer is a real risk signal (computed
  // above from actual GSTR-1 data) — shorten the review cycle instead of
  // defaulting to a flat 12 months regardless of risk.
  const highConcentrationRisk = concentration.topBuyerPct >= 30;
  const tenureMonths = highConcentrationRisk ? 6 : 12;

  // Pull the actual projected shortfall month from the cash-flow model,
  // rather than hand-typing whichever month happened to be the dip when
  // this was last edited.
  const shortfallMonth = CASHFLOW.find((c) => c.base !== null && c.base < 0);

  const bullets = [
    shortfallMonth
      ? `Covers projected ${shortfallMonth.m} shortfall with buffer`
      : "Provides buffer for the normal working-capital cycle",
    `Sized to ${sizingMultiple}× average monthly turnover (₹${avgTurnover}L)`,
    "Interest-only draws against filed GST invoices",
  ];

  if (highConcentrationRisk) {
    bullets.push(
      `Shorter ${tenureMonths}-month review cycle — ${concentration.topBuyerName} accounts for ${concentration.topBuyerPct}% of revenue`
    );
  }

  return {
    amountLakhs,
    facilityType: "Overdraft facility",
    tenureMonths,
    bullets,
  };
}


// ---------------------------------------------------------------------------
// Health score — a deterministic fallback shown before "Generate AI insight"
// is clicked (or if the live API call fails). The AI call produces the
// "real" score from the same metrics; this is a rules-based approximation
// so the card never shows a made-up number.
//
// Weights: start at 50, then move with the same signals a lender would look
// at — filing compliance (up to +30), YoY growth (±10), buyer concentration
// risk (up to -15), and a flat penalty if the stressed cash-flow case goes
// negative anywhere in the forecast.
// ---------------------------------------------------------------------------

export function computeHealthScore() {
  const compliancePct = computeCompliancePct();
  const yoyGrowthPct = computeYoYGrowthPct();
  const concentration = computeBuyerConcentration();
  const dip = CASHFLOW.find((c) => c.low !== null && c.low < 0);

  let score = 50;
  score += compliancePct * 0.3;
  score += Math.max(-20, Math.min(20, yoyGrowthPct)) * 0.5;
  score -= (concentration.topBuyerPct / 100) * 15;
  if (dip) score -= 10;
  score = Math.round(Math.max(0, Math.min(100, score)));

  const band =
    score >= 75 ? "Healthy — Fundable" :
      score >= 55 ? "Stable — Monitor" :
        score >= 35 ? "Caution — Review" :
          "High Risk — Decline";

  const missed = FILING_STATUS.filter((s) => s === "missed").length;
  const late = FILING_STATUS.filter((s) => s === "late").length;

  const narrative =
    `GST compliance is ${compliancePct}% on-time (${missed} missed, ${late} late filing${missed + late === 1 ? "" : "s"}) ` +
    `with turnover ${yoyGrowthPct >= 0 ? "up" : "down"} ${Math.abs(yoyGrowthPct)}% YoY. ` +
    `${concentration.topBuyerName} accounts for ${concentration.topBuyerPct}% of revenue, a concentration risk if that relationship weakens. ` +
    (dip
      ? `The stressed cash-flow case (largest buyer's payment delayed) turns negative in ${dip.m}.`
      : `The stressed cash-flow case stays positive across the forecast window.`);

  return {
    score,
    band,
    narrative,
    recommended_loan_amount_min_lakhs: +(
      computeWorkingCapitalRecommendation().amountLakhs * 0.7
    ).toFixed(1),
    recommended_loan_amount_max_lakhs:
      computeWorkingCapitalRecommendation().amountLakhs,
  };
}


// check which documents are required to compute the health score, so we can show a "missing data" message if any are absent

export const FALLBACK_INSIGHT = computeHealthScore();
