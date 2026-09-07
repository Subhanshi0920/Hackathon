// ---------------------------------------------------------------------------
// calculations.js — a FACTORY that builds the full set of financial
// calculations for whatever GST/bank documents are currently loaded.
//
// This used to bind directly to the static JSON files in ./documents at
// module load time. It's now a function, `buildCalculations(documents)`,
// so the app can rebuild the exact same calculations from EITHER the
// default demo documents OR data the user just uploaded — see
// DataContext.jsx, which is the only place that decides which documents
// are "current" and re-runs this factory when they change.
//
// BORROWERS / business-profile lookup is intentionally NOT part of this
// factory — the multi-business selector in the header is a separate,
// static concern for now (it doesn't yet swap financial data per
// business), so it's exported directly below from the bundled documents.
// ---------------------------------------------------------------------------

import businessProfiles from "./documents/businessProfile.json";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const PAID_EPSILON = 0.005; // lakh-rupee rounding tolerance

// ---------------------------------------------------------------------------
// Business identity — static, not part of the upload/calculation pipeline.
// ---------------------------------------------------------------------------

export const BUSINESS_PROFILES = businessProfiles;

export const BORROWERS = businessProfiles.map((item) => ({
  name: item.legalName,
  gstin: item.gstin,
}));

export function getBusinessProfileByGstin(gstin) {
  return businessProfiles.find((b) => b.gstin === gstin) || null;
}

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

/** Net GST payable for a period: output tax less input tax credit claimed. */
function netTaxLiabilityOf(record) {
  return +((record.outputTaxLakhs || 0) - (record.inputTaxCreditLakhs || 0)).toFixed(2);
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

function averageOf(values) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Builds the full calculations object from a set of documents.
 * @param {object} documents - { gstr3b, gstr1, bankTransactions }
 */
export function buildCalculations(documents) {
  const { gstr3b, gstr1, bankTransactions } = documents;
  const gstReturns = gstr3b.returns;
  const bankMonthly = bankTransactions.monthly;
  const topBuyers = gstr1.topBuyers;
  const previousFyTotalLakhs = gstr3b.previousFinancialYear.totalTurnoverLakhs;

  // ---- GST filing compliance ------------------------------------------------
  const MONTHS = gstReturns.map((r) => r.label);
  const FILING_STATUS = gstReturns.map(filingStatusOf);
  const FILING_DETAIL = gstReturns.map((r) => ({
    period: r.period,
    label: r.label,
    status: filingStatusOf(r),
    daysLate: daysLate(r),
    dueDate: r.dueDate,
    filingDate: r.filingDate,
  }));
  function computeCompliancePct() {
    const onTime = gstReturns.filter((r) => filingStatusOf(r) === "on").length;
    return Math.round((onTime / gstReturns.length) * 100);
  }

  // ---- GST payment status -----------------------------------------------
  const PAYMENT_STATUS = gstReturns.map(paymentStatusOf);
  const PAYMENT_DETAIL = gstReturns.map((r) => ({
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
  function computePaymentCompliancePct() {
    const onTime = gstReturns.filter((r) => paymentStatusOf(r) === "Paid").length;
    return Math.round((onTime / gstReturns.length) * 100);
  }
  function computeTotalOutstandingTaxLakhs() {
    return +gstReturns.reduce((sum, r) => sum + outstandingTaxOf(r), 0).toFixed(2);
  }

  // ---- Turnover ------------------------------------------------------------
  const TURNOVER = gstReturns.map((r) => r.taxableTurnoverLakhs);
  function computeTotalTurnoverLakhs() {
    return +TURNOVER.reduce((sum, v) => sum + v, 0).toFixed(2);
  }
  function computeAverageMonthlyTurnoverLakhs() {
    return +(computeTotalTurnoverLakhs() / TURNOVER.length).toFixed(2);
  }
  function computeYoYGrowthPct() {
    const current = computeTotalTurnoverLakhs();
    return Math.round(((current - previousFyTotalLakhs) / previousFyTotalLakhs) * 100);
  }

  // ---- Buyer concentration -------------------------------------------------
  function computeBuyerConcentration() {
    const total = computeTotalTurnoverLakhs();
    const topBuyerShare = topBuyers[0].valueLakhs / total;
    const top5Share = topBuyers.reduce((sum, b) => sum + b.valueLakhs, 0) / total;
    return {
      topBuyerPct: Math.round(topBuyerShare * 100),
      top5Pct: Math.round(top5Share * 100),
      topBuyerName: topBuyers[0].buyerName,
    };
  }
  const TOP_BUYERS = topBuyers;

  // ---- Cash-flow forecast (calibrated lag/collection-rate model) ----------
  function calibrateCollectionModel() {
    const turnoverByPeriod = new Map(gstReturns.map((r) => [r.period, r.taxableTurnoverLakhs]));
    const allPeriods = gstReturns.map((r) => r.period);

    function turnoverMonthsBefore(period, monthsBack) {
      const idx = allPeriods.indexOf(period);
      const targetIdx = idx - monthsBack;
      if (targetIdx >= 0) return turnoverByPeriod.get(allPeriods[targetIdx]);
      return previousFyTotalLakhs / 12;
    }

    const candidateLags = [0, 1, 2];
    let best = null;

    for (const lag of candidateLags) {
      const pairs = bankMonthly
        .map((b) => ({ turnover: turnoverMonthsBefore(b.period, lag), receipts: b.customerReceiptsLakhs }))
        .filter((p) => p.turnover != null);

      const sumXY = pairs.reduce((s, p) => s + p.turnover * p.receipts, 0);
      const sumXX = pairs.reduce((s, p) => s + p.turnover * p.turnover, 0);
      const rate = sumXX > 0 ? sumXY / sumXX : 0;
      const sqError = pairs.reduce((s, p) => s + (p.receipts - p.turnover * rate) ** 2, 0);

      if (!best || sqError < best.sqError) {
        best = { lagMonths: lag, collectionRate: rate, sqError };
      }
    }

    return { lagMonths: best.lagMonths, collectionRatePct: Math.round(best.collectionRate * 100) };
  }

  function computeCashFlowForecast() {
    const { lagMonths, collectionRatePct } = calibrateCollectionModel();
    const rate = collectionRatePct / 100;
    const concentration = computeBuyerConcentration();

    const turnoverByPeriod = new Map(gstReturns.map((r) => [r.period, r.taxableTurnoverLakhs]));
    const allPeriods = gstReturns.map((r) => r.period);
    const bankPeriods = new Set(bankMonthly.map((b) => b.period));

    const avgOtherInflow = averageOf(bankMonthly.map((b) => b.otherInflowsLakhs));
    const avgOutflow = averageOf(bankMonthly.map((b) => b.totalOutflowsLakhs));

    const result = [];

    for (const b of bankMonthly) {
      const net = +(b.customerReceiptsLakhs + b.otherInflowsLakhs - b.totalOutflowsLakhs).toFixed(2);
      result.push({ period: b.period, m: b.label, actual: net, base: null, low: null, high: null });
    }

    for (const period of allPeriods) {
      if (bankPeriods.has(period)) continue;

      const idx = allPeriods.indexOf(period);
      const sourceIdx = idx - lagMonths;
      const sourceTurnover = sourceIdx >= 0 ? turnoverByPeriod.get(allPeriods[sourceIdx]) : null;
      if (sourceTurnover == null) continue;

      const baseInflow = sourceTurnover * rate + avgOtherInflow;
      const baseNet = +(baseInflow - avgOutflow).toFixed(2);

      const highInflow = sourceTurnover * Math.min(rate * 1.1, 1) + avgOtherInflow;
      const highNet = +(highInflow - avgOutflow).toFixed(2);

      const stressedInflow = baseInflow * (1 - concentration.topBuyerPct / 100);
      const lowNet = +(stressedInflow - avgOutflow).toFixed(2);

      const label = gstReturns.find((r) => r.period === period).label;
      result.push({ period, m: label, actual: null, base: baseNet, low: lowNet, high: highNet });
    }

    return result;
  }

  function describeCashFlowModel() {
    const { lagMonths, collectionRatePct } = calibrateCollectionModel();
    const concentration = computeBuyerConcentration();
    return {
      lagMonths,
      collectionRatePct,
      stressAssumption: `Top buyer (${concentration.topBuyerName}) accounts for ${concentration.topBuyerPct}% of revenue — stressed case assumes their payment doesn't land that month.`,
    };
  }

  const CASHFLOW = computeCashFlowForecast();

  // ---- Seasonality ------------------------------------------------------
  // Detects businesses like AC/cooler sellers whose turnover is structurally
  // lumpy (high pre-summer, low in winter) rather than roughly steady, using
  // only the 12 monthly turnover figures already on file — no extra upload
  // needed. Used to soften the cash-flow "dip" penalty below for troughs
  // that are an expected seasonal pattern rather than a real shortfall.
  function computeSeasonality() {
    const n = TURNOVER.length;
    const mean = TURNOVER.reduce((s, v) => s + v, 0) / n;
    const variance = TURNOVER.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
    // CoV above ~0.35 reads as meaningfully lumpy rather than steady-with-noise.
    const isSeasonal = coefficientOfVariation >= 0.35;

    const peakIdx = TURNOVER.indexOf(Math.max(...TURNOVER));
    const peakMonth = MONTHS[peakIdx];

    // Months meaningfully below average count as an expected seasonal trough.
    const troughThreshold = mean - 0.5 * stdDev;
    const troughPeriods = new Set(
      gstReturns.filter((r, i) => TURNOVER[i] <= troughThreshold).map((r) => r.period),
    );

    return {
      coefficientOfVariation: +coefficientOfVariation.toFixed(2),
      isSeasonal,
      peakMonth,
      troughPeriods,
    };
  }

  // ---- Financials-only health score -----------------------------------------
  // Deterministic rubric a caller (e.g. the AI insight prompt in
  // OverviewSummary.jsx) can also be instructed to reproduce, so the AI's
  // answer and this fallback stay comparable. Bank-perspective factors
  // (CIBIL, ITR, etc.) live in bankFactors.js and are blended in by the
  // caller, not here — this factory only knows about GST/bank documents.
  function computeFinancialScore() {
    const compliancePct = computeCompliancePct();
    const yoyGrowthPct = computeYoYGrowthPct();
    const concentration = computeBuyerConcentration();
    const clampedGrowth = Math.max(-20, Math.min(20, yoyGrowthPct));
    const dip = CASHFLOW.find((c) => c.base !== null && c.base < 0);
    const seasonality = computeSeasonality();
    const dipIsSeasonalTrough = Boolean(
      dip && seasonality.isSeasonal && seasonality.troughPeriods.has(dip.period),
    );
    // A dip that lines up with this business's own seasonal trough (e.g. an
    // AC seller's winter low) still matters for facility sizing, but isn't
    // the same red flag as an unexplained shortfall — softened penalty
    // instead of the full -10.
    const dipPenalty = dip ? (dipIsSeasonalTrough ? 4 : 10) : 0;

    const score = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          50 +
            compliancePct * 0.3 +
            clampedGrowth * 0.5 -
            (concentration.topBuyerPct / 100) * 15 -
            dipPenalty,
        ),
      ),
    );

    const band =
      score >= 75 ? "Healthy — Fundable" :
        score >= 55 ? "Stable — Monitor" :
          score >= 35 ? "Caution — Review" :
            "High Risk — Decline";

    const narrative =
      `GST compliance is ${compliancePct}% on-time, turnover is ${yoyGrowthPct >= 0 ? "up" : "down"} ${Math.abs(yoyGrowthPct)}% YoY, ` +
      `and the top buyer accounts for ${concentration.topBuyerPct}% of revenue.` +
      (dip
        ? dipIsSeasonalTrough
          ? ` The stressed cash-flow case turns negative in ${dip.m}, consistent with this business's seasonal trough (peak month: ${seasonality.peakMonth}).`
          : ` The stressed cash-flow case turns negative in ${dip.m}, outside this business's usual seasonal pattern.`
        : " The stressed cash-flow case stays positive throughout.");

    return { score, band, narrative };
  }

  return {
    MONTHS,
    FILING_STATUS,
    FILING_DETAIL,
    computeCompliancePct,
    PAYMENT_STATUS,
    PAYMENT_DETAIL,
    computePaymentCompliancePct,
    computeTotalOutstandingTaxLakhs,
    TURNOVER,
    computeTotalTurnoverLakhs,
    computeAverageMonthlyTurnoverLakhs,
    computeYoYGrowthPct,
    computeBuyerConcentration,
    TOP_BUYERS,
    calibrateCollectionModel,
    computeCashFlowForecast,
    describeCashFlowModel,
    CASHFLOW,
    computeSeasonality,
    computeFinancialScore,
  };
}
