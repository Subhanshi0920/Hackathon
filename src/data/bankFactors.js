// ---------------------------------------------------------------------------
// bankFactors.js — turns the "beyond-financials" signals a bank actually
// looks at (social presence, CIBIL, ITRs, balance sheets, ownership, bank
// conduct, online reputation, location, competition) into a single set of
// normalized (0-100) factor scores plus one weighted Bank Confidence Score.
//
// This is intentionally self-contained: it reads businessRiskFactors.json
// directly and doesn't depend on calculations.js/DataContext, mirroring how
// BORROWERS/businessProfile.json is already a separate, static concern from
// the GST/bank-statement calculation pipeline (see calculations.js header).
// ---------------------------------------------------------------------------

import riskProfiles from "./documents/businessRiskFactors.json";
import { extractCityFromAddress, getCityTier } from "./cityTiers.js";

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const round1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Maps an RBI tier (1-6, see cityTiers.js) to a 0-100 location-quality score
// component. This mapping is OUR scoring policy — RBI defines the tiers
// themselves by population, not what score a lender should assign to each
// one, so this is the one part of the location logic that's a genuine
// design choice rather than sourced from the RBI classification.
// ---------------------------------------------------------------------------
const TIER_SCORE = { 1: 90, 2: 75, 3: 60, 4: 45, 5: 30, 6: 15 };
// If a registered address doesn't match anything in our Census reference
// subset (see cityTiers.js), we don't want to silently guess Tier 1 or
// Tier 6 — this deliberately-moderate fallback (Tier-3-equivalent) neither
// rewards nor penalizes an address we simply don't have population data
// for yet.
const UNMATCHED_CITY_FALLBACK_SCORE = 60;

function cityTierScoreOf(address) {
  const cityName = extractCityFromAddress(address);
  const { matched, tier } = getCityTier(cityName);
  if (!matched) return UNMATCHED_CITY_FALLBACK_SCORE;
  return TIER_SCORE[tier] ?? UNMATCHED_CITY_FALLBACK_SCORE;
}

// Derived from actual nearby-competitor count rather than trusted as a
// separately-stored label — a stored "Low/Moderate/High" string could
// silently disagree with the count it's supposed to summarize. This keeps
// the two in permanent agreement.
function competitiveIntensityOf(competitorCountNearby) {
  if (competitorCountNearby < 5) return "Low";
  if (competitorCountNearby <= 10) return "Moderate";
  return "High";
}

export function getBusinessRiskProfileByGstin(gstin) {
  return riskProfiles.find((p) => p.gstin === gstin) || null;
}

export { competitiveIntensityOf };

// ---- Individual factor scorers (each returns 0-100) -----------------------

function scoreSocialMedia(social) {
  const totalFollowers = social.platforms.reduce((s, p) => s + p.followers, 0);
  const avgEngagement =
    social.platforms.reduce((s, p) => s + p.engagementRatePct, 0) / social.platforms.length;
  const verifiedShare =
    social.platforms.filter((p) => p.verified).length / social.platforms.length;

  const followerScore = clamp((Math.log10(totalFollowers + 1) / Math.log10(50000)) * 100);
  const engagementScore = clamp((avgEngagement / 5) * 100);
  const cadenceScore = clamp((social.postFrequencyPerMonth / 12) * 100);

  return clamp(
    followerScore * 0.3 +
      engagementScore * 0.25 +
      cadenceScore * 0.15 +
      verifiedShare * 100 * 0.1 +
      social.sentimentScorePct * 0.2
  );
}

function scoreBusinessAge(businessAge) {
  // 8+ years reads as fully mature for SME lending purposes.
  return clamp((businessAge.yearsInOperation / 8) * 100);
}

function scoreCibil(cibil) {
  const base = clamp(((cibil.score - 300) / (900 - 300)) * 100);
  // Penalties softened from the original version, which stacked hard enough
  // that a "Fair" (650-700) CIBIL score — not actually alarming in Indian
  // credit terms — could collapse to near-zero once utilization/enquiry/
  // overdue penalties were added on top. These caps still meaningfully
  // penalize real red flags, just without erasing the base score's meaning.
  const utilizationPenalty = clamp((cibil.creditUtilizationPct - 30) * 0.35, 0, 15);
  const enquiryPenalty = clamp(cibil.enquiriesLast6Months * 2, 0, 10);
  const overduePenalty = clamp(cibil.overdueAccounts * 8, 0, 20);
  return clamp(base - utilizationPenalty - enquiryPenalty - overduePenalty);
}

function scoreItr(itrRecords) {
  const onTimeShare = itrRecords.filter((r) => r.filedOnTime).length / itrRecords.length;
  const first = itrRecords[0].grossTotalIncomeLakhs;
  const last = itrRecords[itrRecords.length - 1].grossTotalIncomeLakhs;
  const periods = itrRecords.length - 1;

  // Previously this compared first-vs-last across however many years happened
  // to be on file (e.g. a 2-year CUMULATIVE change) and fed it into a formula
  // built assuming single-year swings, unclamped — inconsistent with how
  // GST's YoY growth is measured (clamped to +/-20%) and sensitive to how
  // much ITR history a business happened to have on file. Annualizing (CAGR)
  // and clamping the same way makes the two growth signals comparable.
  let growthPctAnnualized = 0;
  if (periods > 0 && first > 0) {
    growthPctAnnualized = (Math.pow(last / first, 1 / periods) - 1) * 100;
  }
  const clampedGrowth = clamp(growthPctAnnualized, -20, 20);
  const growthScore = clamp(50 + clampedGrowth);

  return clamp(onTimeShare * 100 * 0.6 + growthScore * 0.4);
}

function scoreBalanceSheet(bs) {
  const currentRatio = bs.currentLiabilitiesLakhs > 0 ? bs.currentAssetsLakhs / bs.currentLiabilitiesLakhs : 2;
  const debtToEquity = bs.netWorthLakhs > 0 ? bs.totalDebtLakhs / bs.netWorthLakhs : 5;
  const currentRatioScore = clamp((currentRatio / 2) * 100);
  const leverageScore = clamp(100 - debtToEquity * 25);
  const netWorthScore = clamp((bs.netWorthLakhs / bs.totalAssetsLakhs) * 100);
  return clamp(currentRatioScore * 0.4 + leverageScore * 0.35 + netWorthScore * 0.25);
}

function scoreProvisionalBalanceSheet(pbs, bs) {
  const netWorthTrendPct =
    bs.netWorthLakhs !== 0 ? ((pbs.netWorthLakhs - bs.netWorthLakhs) / Math.abs(bs.netWorthLakhs)) * 100 : 0;
  const assetTrendPct =
    bs.totalAssetsLakhs !== 0 ? ((pbs.totalAssetsLakhs - bs.totalAssetsLakhs) / bs.totalAssetsLakhs) * 100 : 0;
  return clamp(50 + netWorthTrendPct * 0.5 + assetTrendPct * 0.5);
}

function scoreGst(gstProfile, liveCompliancePct) {
  // Previously this read gstProfile.returnFilingConsistencyPct — a static
  // number baked into businessRiskFactors.json, completely disconnected
  // from computeCompliancePct() in calculations.js (the function that
  // actually parses real GST filings and reacts live to uploads). That
  // meant two "GST compliance" numbers could exist and permanently
  // disagree. liveCompliancePct is now required from the caller; the
  // static field is kept only as a fallback for contexts with no live
  // GST data available at all.
  const compliancePct = liveCompliancePct ?? gstProfile.returnFilingConsistencyPct;
  const statusScore = gstProfile.registrationStatus === "Active" ? 100 : 0;
  const cancellationPenalty = gstProfile.cancellationHistory ? 25 : 0;
  return clamp(statusScore * 0.2 + compliancePct * 0.8 - cancellationPenalty);
}

function scoreOwnership(ownership) {
  const countScore = ownership.numberOfOwners === 1 ? 65 : ownership.numberOfOwners <= 4 ? 100 : 75;
  const stabilityScore = clamp((ownership.ownershipStabilityYears / 8) * 100);
  const verifiedShare =
    ownership.owners.filter((o) => o.panVerified).length / ownership.owners.length;
  return clamp(countScore * 0.35 + stabilityScore * 0.35 + verifiedShare * 100 * 0.3);
}

function scoreBankAccounts(accounts) {
  const avgBalance = accounts.reduce((s, a) => s + a.avgMonthlyBalanceLakhs, 0) / accounts.length;
  const totalBounces = accounts.reduce((s, a) => s + a.bounceCountLast12Months, 0);
  const avgAge = accounts.reduce((s, a) => s + a.accountAgeYears, 0) / accounts.length;

  const balanceScore = clamp((avgBalance / 10) * 100);
  const bouncePenalty = clamp(totalBounces * 10, 0, 60);
  const ageScore = clamp((avgAge / 6) * 100);

  return clamp(balanceScore * 0.5 + ageScore * 0.2 - bouncePenalty + 30);
}

function scoreGoogleRating(googleRating) {
  const ratingScore = clamp((googleRating.rating / 5) * 100);
  // A handful of reviews shouldn't carry as much weight as a few hundred.
  const volumeConfidence = clamp(Math.log10(googleRating.totalReviews + 1) / Math.log10(300), 0, 1);
  return clamp(ratingScore * (0.6 + 0.4 * volumeConfidence));
}

function scoreOnlineReviews(reviews) {
  return clamp(reviews.positivePct - reviews.negativePct * 0.5 + 20);
}

function scoreLocation(location) {
  // City tier is DERIVED from the verified registered address using RBI's
  // official population-based classification (see cityTiers.js) — not
  // trusted as a free-text claim. Foot traffic, transport proximity, and
  // owned/leased status are treated as facts a bank would collect via
  // field investigation (a real, standard part of SME underwriting — see
  // any "Video PD"/"FI" step in a real credit process), not something the
  // applicant self-declares, so those stay as provided.
  const cityTierScore = cityTierScoreOf(location.address);
  const footTrafficScore = { High: 100, Medium: 65, Low: 30 }[location.footTraffic] ?? 50;
  const proximityScore = clamp(100 - location.proximityToTransportKm * 8);
  const tenureScore = location.ownedOrLeased === "Owned" ? 100 : 65;
  return clamp(cityTierScore * 0.3 + footTrafficScore * 0.35 + proximityScore * 0.175 + tenureScore * 0.175);
}

function scoreCompetition(competition) {
  const derivedIntensity = competitiveIntensityOf(competition.competitorCountNearby);
  const intensityScore = { Low: 100, Moderate: 65, High: 35 }[derivedIntensity] ?? 50;
  const shareScore = clamp(competition.estimatedMarketSharePct * 4);
  return clamp(intensityScore * 0.55 + shareScore * 0.45);
}

// ---- Weights (sum to 100) --------------------------------------------------

const WEIGHTS = {
  cibil: 15,
  gst: 10,
  itr: 10,
  balanceSheet: 10,
  businessAge: 8,
  bankAccounts: 8,
  googleRating: 8,
  onlineReviews: 8,
  socialMedia: 5,
  ownership: 5,
  provisionalBalanceSheet: 5,
  location: 4,
  competition: 4,
};

/**
 * Builds the full bank-perspective factor assessment for one business's
 * risk profile (from getBusinessRiskProfileByGstin).
 * @param {object} profile - the business's static risk profile
 * @param {object} [options]
 * @param {number} [options.liveGstCompliancePct] - the REAL, currently-
 *   computed GST filing compliance % (from calculations.js's
 *   computeCompliancePct()), which reacts to GST uploads. Falls back to
 *   the static profile field only if not supplied.
 */
export function buildBankFactorAssessment(profile, options = {}) {
  const liveCompliancePct = options.liveGstCompliancePct;
  const raw = {
    socialMedia: scoreSocialMedia(profile.socialMedia),
    businessAge: scoreBusinessAge(profile.businessAge),
    cibil: scoreCibil(profile.cibil),
    itr: scoreItr(profile.itr),
    balanceSheet: scoreBalanceSheet(profile.balanceSheet),
    provisionalBalanceSheet: scoreProvisionalBalanceSheet(profile.provisionalBalanceSheet, profile.balanceSheet),
    gst: scoreGst(profile.gstProfile, liveCompliancePct),
    ownership: scoreOwnership(profile.ownership),
    bankAccounts: scoreBankAccounts(profile.bankAccounts),
    googleRating: scoreGoogleRating(profile.googleRating),
    onlineReviews: scoreOnlineReviews(profile.onlineReviews),
    location: scoreLocation(profile.location),
    competition: scoreCompetition(profile.competition),
  };

  const displayedCompliancePct = liveCompliancePct ?? profile.gstProfile.returnFilingConsistencyPct;
  const derivedIntensity = competitiveIntensityOf(profile.competition.competitorCountNearby);

  const FACTORS = [
    { key: "cibil", label: "CIBIL Score", value: profile.cibil.score, unit: "" },
    { key: "gst", label: "GST Standing", value: round1(displayedCompliancePct), unit: "%" },
    { key: "itr", label: "ITR Track Record", value: profile.itr.length, unit: " yrs filed" },
    { key: "balanceSheet", label: "Balance Sheet", value: profile.balanceSheet.netWorthLakhs, unit: "L net worth" },
    { key: "businessAge", label: "Business Age", value: round1(profile.businessAge.yearsInOperation), unit: " yrs" },
    { key: "bankAccounts", label: "Bank Conduct", value: profile.bankAccounts.length, unit: " a/c" },
    { key: "googleRating", label: "Google Rating", value: profile.googleRating.rating, unit: "★" },
    { key: "onlineReviews", label: "Online Reviews", value: profile.onlineReviews.positivePct, unit: "% positive" },
    { key: "socialMedia", label: "Social Media Presence", value: profile.socialMedia.platforms.reduce((s, p) => s + p.followers, 0), unit: " followers" },
    { key: "ownership", label: "Ownership Stability", value: profile.ownership.numberOfOwners, unit: " owner(s)" },
    { key: "provisionalBalanceSheet", label: "Provisional B/S Trend", value: profile.provisionalBalanceSheet.netWorthLakhs, unit: "L net worth (H1)" },
    { key: "location", label: "Location Quality", value: profile.location.footTraffic, unit: "" },
    { key: "competition", label: "Competitive Position", value: derivedIntensity, unit: "" },
  ].map((f) => ({ ...f, score: round1(raw[f.key]), weight: WEIGHTS[f.key] }));

  const overallScore = round1(
    FACTORS.reduce((sum, f) => sum + f.score * (f.weight / 100), 0)
  );

  const band =
    overallScore >= 75 ? "Strong — Bank-ready" :
    overallScore >= 55 ? "Adequate — Monitor" :
    overallScore >= 35 ? "Weak — Needs mitigants" :
    "Poor — High risk";

  return { FACTORS, overallScore, band };
}