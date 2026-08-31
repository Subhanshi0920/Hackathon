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

  // ---- Working capital recommendation --------------------------------------
  function computeWorkingCapitalRecommendation() {
    const avgTurnover = computeAverageMonthlyTurnoverLakhs();
    const concentration = computeBuyerConcentration();

    const sizingMultiple = 0.8;
    const amountLakhs = +(avgTurnover * sizingMultiple).toFixed(1);

    const highConcentrationRisk = concentration.topBuyerPct >= 30;
    const tenureMonths = highConcentrationRisk ? 6 : 12;

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

    return { amountLakhs, facilityType: "Overdraft facility", tenureMonths, bullets };
  }

  // ---- Health score ----------------------------------------------------
  function computeHealthScore() {
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

    return { score, band, narrative };
  }

  const FALLBACK_INSIGHT = computeHealthScore();

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
    computeWorkingCapitalRecommendation,
    computeHealthScore,
    FALLBACK_INSIGHT,
  };
}