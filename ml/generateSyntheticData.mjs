// ---------------------------------------------------------------------------
// generateSyntheticData.mjs — produces training_data.csv for the health-
// score ML model.
//
// Run with: node ml/generateSyntheticData.mjs
//
// DESIGN PRINCIPLES (see conversation history for the full reasoning):
//
// 1. ONE SOURCE OF TRUTH FOR FEATURES — every synthetic business is scored
//    by the REAL buildBankFactorAssessment() from src/data/bankFactors.js,
//    the exact function the live app uses. Nothing here re-implements or
//    approximates that scoring logic. This makes train/serve mismatch
//    structurally impossible.
//
// 2. MULTI-YEAR TRAJECTORIES — each business has a hidden "true risk" value
//    that DRIFTS year to year (persistent per-business trend + noise), not
//    independent random draws per field. Every generated number (CIBIL
//    history, ITR income growth, balance sheet trend) derives from that
//    trajectory, so a business's story is internally coherent — a business
//    trending toward trouble shows it consistently across signals, the way
//    the real 3 demo businesses already do.
//
// 3. TWO REAL, RESEARCHED CONDITIONAL FLAGS — hasGoogleBusinessListing
//    (gates Google Rating + Online Reviews) and hasActiveSocialMedia (gates
//    Social Media Presence). These are independent of the business's true
//    risk — presence/absence of a digital footprint is not itself a risk
//    signal, only a data-availability fact, so the generator does NOT
//    correlate them with risk. This matters: it stops the model from
//    learning a spurious "no social media = risky" shortcut.
//
// 4. LABELS ARE FREE TO DIVERGE from bankFactors.js's fixed WEIGHTS —
//    the ground-truth default probability is built from the 13 computed
//    factor scores using a genuinely different weighting (grounded in what
//    the real Indian government/PSB "digital footprint" credit model
//    actually prioritizes — GST/bureau/bank data most heavily, reputation
//    signals lightly), plus deliberate interaction terms a flat weighted
//    average cannot express.
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildBankFactorAssessment } from "../src/data/bankFactors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const N_BUSINESSES = 2500;
const YEARS = 4; // matches the real demo's ~4 quarters of CIBIL history / 3 ITR years + provisional

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32) — reproducible runs, so re-generating the dataset
// doesn't silently change results between demo runs.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260907);
const uniform = (min, max) => min + rand() * (max - min);
const gaussian = () => {
  // Box-Muller
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// A riskier business tends to look riskier across the board (realistic —
// this is why the shared trajectory exists at all), but a real business can
// still have strong financials with mediocre CIBIL, or vice versa. Without
// some independent variation PER FACTOR, every one of the 13 factors ends
// up almost perfectly correlated (all driven by the same single `risk`
// number), which causes a real, observed problem: logistic regression
// can't tell which correlated factor actually matters, arbitrarily
// concentrates weight on just one of them, and effectively ignores the
// others — including CIBIL, which should never be ignored. This blends
// the shared trajectory with a substantial independent component per call,
// so each factor has its own signal the model can actually learn from.
function localRisk(sharedRisk, independence = 0.4) {
  const blended = sharedRisk * (1 - independence) + rand() * independence;
  return clamp(blended + gaussian() * 0.04, 0.02, 0.98);
}

const CITIES = [
  "Mumbai, Maharashtra", "Bengaluru, Karnataka", "Delhi", "Pune, Maharashtra",
  "Ahmedabad, Gujarat", "Chennai, Tamil Nadu", "Hyderabad, Telangana", "Jaipur, Rajasthan",
  "Lucknow, Uttar Pradesh", "Indore, Madhya Pradesh", "Coimbatore, Tamil Nadu", "Shimla, Himachal Pradesh",
];

// ---------------------------------------------------------------------------
// One business's hidden risk trajectory: starts somewhere on [0.05, 0.95]
// (0 = very healthy, 1 = very risky), then drifts with a persistent
// per-business trend plus period noise.
// ---------------------------------------------------------------------------
function generateRiskTrajectory() {
  const start = clamp(uniform(0.05, 0.95), 0.02, 0.98);
  const drift = gaussian() * 0.035; // persistent per-business trend, positive = worsening
  const trajectory = [start];
  for (let t = 1; t < YEARS; t++) {
    const next = clamp(trajectory[t - 1] + drift + gaussian() * 0.025, 0.02, 0.98);
    trajectory.push(next);
  }
  return trajectory;
}

/** Builds one full businessRiskFactors.json-shaped profile from a risk trajectory. */
function buildSyntheticProfile(riskTrajectory, flags) {
  const risk = riskTrajectory[riskTrajectory.length - 1]; // current/latest risk
  const priorRisk = riskTrajectory[riskTrajectory.length - 2] ?? risk;

  // ---- Business age & registration ----
  const ageRisk = localRisk(risk, 0.35);
  const yearsInOperation = clamp(uniform(0.5, 15) - ageRisk * 2, 0.4, 18);
  const registeredSince = new Date(Date.now() - yearsInOperation * 365.25 * 86400000).toISOString().slice(0, 10);

  // ---- CIBIL (with quarterly history walking the trajectory, but the
  // CURRENT snapshot gets its own independent draw so CIBIL doesn't move
  // in lockstep with balance sheet / GST / everything else) ----
  const cibilScoreAt = (r) => Math.round(clamp(900 - r * 600 + gaussian() * 20, 300, 900));
  const cibilRisk = localRisk(risk, 0.35);
  const cibilHistory = riskTrajectory.slice(0, -1).map((r, i) => ({ quarter: `Y${i + 1}`, score: cibilScoreAt(r) }));
  cibilHistory.push({ quarter: `Y${riskTrajectory.length}`, score: cibilScoreAt(cibilRisk) });
  const cibil = {
    score: cibilHistory[cibilHistory.length - 1].score,
    reportDate: new Date().toISOString().slice(0, 10),
    enquiriesLast6Months: Math.round(clamp(localRisk(risk, 0.4) * 8 + gaussian() * 1.5, 0, 12)),
    overdueAccounts: Math.round(clamp((localRisk(risk, 0.4) - 0.5) * 6 + gaussian(), 0, 5)),
    creditUtilizationPct: Math.round(clamp(15 + localRisk(risk, 0.4) * 75 + gaussian() * 8, 3, 98)),
    history: cibilHistory,
  };

  // ---- ITR (income trajectory, growth rate independently varied) ----
  const itrYears = Math.min(3, YEARS);
  const baseIncome = uniform(10, 300);
  const itrRisk = localRisk(risk, 0.45);
  const growthRate = clamp((0.5 - itrRisk) * 0.35 + gaussian() * 0.05, -0.35, 0.35);
  const itr = [];
  let income = baseIncome;
  for (let i = 0; i < itrYears; i++) {
    if (i > 0) income = clamp(income * (1 + growthRate + gaussian() * 0.03), 1, 5000);
    itr.push({
      financialYear: `FY${20 + i}`,
      grossTotalIncomeLakhs: +income.toFixed(1),
      taxPaidLakhs: +(income * uniform(0.08, 0.15)).toFixed(1),
      filedOnTime: rand() > localRisk(risk, 0.45) * 0.75,
    });
  }

  // ---- Balance sheet & provisional balance sheet (independently varied) ----
  function balanceSheetAt(r, incomeAtT) {
    const totalAssetsLakhs = +(incomeAtT * uniform(1.2, 1.9)).toFixed(1);
    const netWorthPct = clamp(0.72 - r * 0.62 + gaussian() * 0.05, 0.02, 0.85);
    const netWorthLakhs = +(totalAssetsLakhs * netWorthPct).toFixed(1);
    const totalLiabilitiesLakhs = +(totalAssetsLakhs - netWorthLakhs).toFixed(1);
    const totalDebtLakhs = +(totalLiabilitiesLakhs * uniform(0.55, 0.85)).toFixed(1);
    const currentAssetsLakhs = +(totalAssetsLakhs * uniform(0.4, 0.6)).toFixed(1);
    const currentLiabilitiesLakhs = +(totalLiabilitiesLakhs * uniform(0.45, 0.75)).toFixed(1);
    return { totalAssetsLakhs, totalLiabilitiesLakhs, netWorthLakhs, currentAssetsLakhs, currentLiabilitiesLakhs, totalDebtLakhs };
  }
  const bsRisk = localRisk(priorRisk, 0.4);
  const balanceSheet = { financialYear: "FY-1", ...balanceSheetAt(bsRisk, income) };
  // Provisional (H1) genuinely should track the SAME business's trend, so
  // it stays tied to bsRisk plus the trajectory's own drift, not a fresh
  // independent draw — otherwise "trend" would be meaningless noise.
  const provisionalBalanceSheet = {
    financialYear: "FY-Provisional",
    ...balanceSheetAt(clamp(bsRisk + (risk - priorRisk), 0.02, 0.98), income * (1 + growthRate * 0.5)),
  };

  // ---- GST profile (independently varied — filing behavior is its own signal) ----
  const gstRisk = localRisk(risk, 0.45);
  const gstProfile = {
    registrationStatus: "Active",
    returnFilingConsistencyPct: Math.round(clamp(100 - gstRisk * 88 + gaussian() * 6, 15, 100)),
    yearsSinceRegistration: +yearsInOperation.toFixed(1),
    cancellationHistory: gstRisk > 0.85 && rand() < 0.12,
  };

  // ---- Ownership ----
  const ownershipRisk = localRisk(risk, 0.5);
  const ownerCount = ownershipRisk > 0.7 && rand() < 0.4 ? 1 : Math.min(5, Math.round(clamp(uniform(1, 4), 1, 5)));
  const owners = Array.from({ length: ownerCount }, (_, i) => ({
    name: `Owner ${i + 1}`,
    sharePct: i === 0 ? Math.round(100 / ownerCount) + (100 % ownerCount) : Math.round(100 / ownerCount),
    panVerified: rand() > ownershipRisk * 0.35,
  }));
  const ownership = { numberOfOwners: ownerCount, ownershipStabilityYears: +yearsInOperation.toFixed(1), owners };

  // ---- Bank accounts (independently varied — cash discipline is its own signal) ----
  const bankRisk = localRisk(risk, 0.4);
  const avgMonthlyBalanceLakhs = +clamp((income / 12) * (1 - bankRisk * 0.72) * uniform(0.5, 1.4), 0.05, 60).toFixed(1);
  const bounceCountLast12Months = Math.round(clamp(localRisk(risk, 0.4) * 9 + gaussian() * 1.5, 0, 15));
  const bankAccounts = [
    { bankName: "Bank A", accountType: "Current", accountAgeYears: +(yearsInOperation * uniform(0.6, 1)).toFixed(1), avgMonthlyBalanceLakhs, bounceCountLast12Months },
  ];

  // ---- Google rating / online reviews (only if flagged present; reputation
  // is deliberately given the WEAKEST tie to financial risk, consistent
  // with the real Indian PSB "digital footprint" model not using this
  // signal at all — see design note #3 at the top of this file) ----
  let googleRating = null;
  let onlineReviews = null;
  if (flags.hasGoogleBusinessListing) {
    const ratingRisk = localRisk(risk, 0.6);
    const rating = +clamp(5 - ratingRisk * 3.2 + gaussian() * 0.4, 1, 5).toFixed(1);
    googleRating = { rating, totalReviews: Math.round(uniform(5, 320)), trend: [] };
    const reviewRisk = localRisk(risk, 0.6);
    const positivePct = Math.round(clamp(92 - reviewRisk * 75 + gaussian() * 8, 5, 98));
    const negativePct = Math.round(clamp(reviewRisk * 55 + gaussian() * 6, 1, 90));
    const neutralPct = Math.max(0, 100 - positivePct - negativePct);
    onlineReviews = { positivePct, neutralPct, negativePct, commonThemes: [] };
  }

  // ---- Social media (only if flagged present; same weak-tie reasoning as Google rating) ----
  let socialMedia = null;
  if (flags.hasActiveSocialMedia) {
    const socialRisk = localRisk(risk, 0.6);
    const followerBase = Math.round(clamp(20000 * (1 - socialRisk) * uniform(0.1, 1.6), 50, 40000));
    socialMedia = {
      platforms: [{ name: "Instagram", followers: followerBase, engagementRatePct: +clamp(4 - socialRisk * 3, 0.1, 5).toFixed(1), verified: rand() > 0.5 }],
      postFrequencyPerMonth: Math.round(clamp(14 * (1 - socialRisk) + gaussian() * 2, 0, 20)),
      sentimentScorePct: Math.round(clamp(85 - socialRisk * 55 + gaussian() * 6, 5, 98)),
    };
  }

  // ---- Location & competition ----
  const address = CITIES[Math.floor(rand() * CITIES.length)];
  const footTraffic = ["High", "Medium", "Low"][clamp(Math.round(localRisk(risk, 0.55) * 2 + gaussian() * 0.4), 0, 2)];
  const location = {
    address,
    areaType: "Industrial/commercial area",
    footTraffic,
    proximityToTransportKm: +clamp(1 + risk * 6 + gaussian(), 0.2, 10).toFixed(1),
    ownedOrLeased: rand() > risk * 0.5 ? "Owned" : "Leased",
  };
  const competitorCountNearby = Math.round(clamp(3 + localRisk(risk, 0.55) * 14 + gaussian() * 2, 1, 25));
  const competition = {
    competitorCountNearby,
    estimatedMarketSharePct: Math.round(clamp(25 - localRisk(risk, 0.55) * 22 + gaussian() * 4, 1, 40)),
  };

  return {
    socialMedia, businessAge: { registeredSince, yearsInOperation: +yearsInOperation.toFixed(1) },
    cibil, itr, balanceSheet, provisionalBalanceSheet, gstProfile, ownership, bankAccounts,
    googleRating, onlineReviews, location, competition,
  };
}

// ---------------------------------------------------------------------------
// FREE-TO-DIVERGE ground truth. Deliberately NOT the same weights as
// bankFactors.js's WEIGHTS constant — grounded instead in what the real
// Indian government/PSB "digital footprint" credit model actually
// prioritizes (GST + bureau + bank data most heavily; reputation signals,
// which aren't part of that real model at all, only lightly).
// ---------------------------------------------------------------------------
const TRUE_IMPORTANCE = {
  cibil: 0.20, gst: 0.14, revenueReconciliation: 0.10, bankAccounts: 0.13, balanceSheet: 0.11, itr: 0.09,
  provisionalBalanceSheet: 0.06, businessAge: 0.05, ownership: 0.04,
  location: 0.03, competition: 0.03,
  googleRating: 0.02, onlineReviews: 0.02, socialMedia: 0.01,
};

function simulateOutcome(factorScores, flags) {
  // deviation from neutral (50), signed so higher score = lower deviation-risk
  const dev = (key) => (50 - factorScores[key]) / 50; // +1 = worst possible, -1 = best possible

  let z = -2.0; // calibrated to ~12% historical default rate, matching realistic SME lending books
  for (const [key, w] of Object.entries(TRUE_IMPORTANCE)) {
    if ((key === "googleRating" || key === "onlineReviews") && !flags.hasGoogleBusinessListing) continue;
    if (key === "socialMedia" && !flags.hasActiveSocialMedia) continue;
    z += w * 3.2 * dev(key);
  }

  // Interactions a flat weighted average structurally cannot express:
  const cibilWeak = Math.max(0, dev("cibil"));
  const bsWeak = Math.max(0, dev("balanceSheet"));
  const gstWeak = Math.max(0, dev("gst"));
  const bankWeak = Math.max(0, dev("bankAccounts"));
  const reconciliationWeak = Math.max(0, dev("revenueReconciliation"));
  const locationStrong = Math.max(0, -dev("location"));

  z += 1.1 * cibilWeak * bsWeak; // compounding financial distress
  z += 0.9 * gstWeak * bankWeak; // GST inconsistency + bounces = same underlying cash-discipline problem
  z += 0.7 * reconciliationWeak * gstWeak; // declared revenue not matching actual collections AND poor filing behavior = compounding integrity risk
  z -= 0.4 * locationStrong * cibilWeak; // strong market access partially offsets weak credit

  z += gaussian() * 0.25; // irreducible noise
  return 1 / (1 + Math.exp(-z));
}

// ---------------------------------------------------------------------------
// Generate the dataset
// ---------------------------------------------------------------------------
const rows = [];
let defaultCount = 0;

for (let i = 0; i < N_BUSINESSES; i++) {
  const riskTrajectory = generateRiskTrajectory();
  const risk = riskTrajectory[riskTrajectory.length - 1];
  // Presence flags deliberately independent of risk (see design note #3 above).
  const flags = { hasGoogleBusinessListing: rand() < 0.82, hasActiveSocialMedia: rand() < 0.5 };

  const profile = buildSyntheticProfile(riskTrajectory, flags);

  // Synthetic collection rate: how well this business's declared GST
  // turnover reconciles with what it can actually be shown to have
  // collected (bank + cash sales bills). Tied to risk with independent
  // noise, same pattern as every other factor — riskier businesses tend to
  // reconcile worse (inflated filings or genuine collection trouble), but
  // this is NOT deterministic from risk alone.
  const collectionRatePct = clamp(100 - localRisk(risk, 0.4) * 70 + gaussian() * 12, 10, 180);

  const assessment = buildBankFactorAssessment(profile, {
    liveGstCompliancePct: profile.gstProfile.returnFilingConsistencyPct,
    collectionRatePct,
  });

  const factorScores = {};
  for (const f of assessment.FACTORS) factorScores[f.key] = f.score;
  // Mean-impute any conditionally-absent factor to neutral (50) for the
  // feature vector — the paired has_* indicator (below) is what tells the
  // model this value is imputed, not observed, so it can learn to weight
  // it accordingly rather than being misled by a fake "average" business.
  for (const key of ["googleRating", "onlineReviews", "socialMedia"]) {
    if (!(key in factorScores)) factorScores[key] = 50;
  }

  const defaultProb = simulateOutcome(factorScores, flags);
  const defaulted = rand() < defaultProb ? 1 : 0;
  defaultCount += defaulted;

  rows.push({
    ...factorScores,
    has_google_listing: flags.hasGoogleBusinessListing ? 1 : 0,
    has_social_media: flags.hasActiveSocialMedia ? 1 : 0,
    overall_score_ruleformula: assessment.overallScore, // for reference/debug only, not a training feature
    true_hidden_risk: +riskTrajectory[riskTrajectory.length - 1].toFixed(3), // debug only
    defaulted,
  });
}

console.log(`Generated ${N_BUSINESSES} synthetic businesses.`);
console.log(`Historical default rate: ${((defaultCount / N_BUSINESSES) * 100).toFixed(1)}%`);
console.log(`Google listing present: ${(rows.filter((r) => r.has_google_listing).length / N_BUSINESSES * 100).toFixed(0)}%`);
console.log(`Active social media present: ${(rows.filter((r) => r.has_social_media).length / N_BUSINESSES * 100).toFixed(0)}%`);

// ---- Write CSV ----
const columns = Object.keys(rows[0]);
const csvLines = [columns.join(",")];
for (const row of rows) csvLines.push(columns.map((c) => row[c]).join(","));
fs.writeFileSync(path.join(__dirname, "training_data.csv"), csvLines.join("\n"));
console.log(`Wrote ${rows.length} rows to ml/training_data.csv`);
