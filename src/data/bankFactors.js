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

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const round1 = (n) => Math.round(n * 10) / 10;

export function getBusinessRiskProfileByGstin(gstin) {
  return riskProfiles.find((p) => p.gstin === gstin) || null;
}

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
  const utilizationPenalty = clamp((cibil.creditUtilizationPct - 30) * 0.6, 0, 25);
  const enquiryPenalty = clamp(cibil.enquiriesLast6Months * 3, 0, 15);
  const overduePenalty = clamp(cibil.overdueAccounts * 12, 0, 30);
  return clamp(base - utilizationPenalty - enquiryPenalty - overduePenalty);
}

function scoreItr(itrRecords) {
  const onTimeShare = itrRecords.filter((r) => r.filedOnTime).length / itrRecords.length;
  const first = itrRecords[0].grossTotalIncomeLakhs;
  const last = itrRecords[itrRecords.length - 1].grossTotalIncomeLakhs;
  const growthPct = first > 0 ? ((last - first) / first) * 100 : 0;
  const growthScore = clamp(50 + growthPct);
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

function scoreGst(gstProfile) {
  const statusScore = gstProfile.registrationStatus === "Active" ? 100 : 0;
  const cancellationPenalty = gstProfile.cancellationHistory ? 25 : 0;
  return clamp(statusScore * 0.2 + gstProfile.returnFilingConsistencyPct * 0.8 - cancellationPenalty);
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
  const footTrafficScore = { High: 100, Medium: 65, Low: 30 }[location.footTraffic] ?? 50;
  const proximityScore = clamp(100 - location.proximityToTransportKm * 8);
  const tenureScore = location.ownedOrLeased === "Owned" ? 100 : 65;
  return clamp(footTrafficScore * 0.5 + proximityScore * 0.25 + tenureScore * 0.25);
}

function scoreCompetition(competition) {
  const intensityScore = { Low: 100, Moderate: 65, High: 35 }[competition.competitiveIntensity] ?? 50;
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
 */
export function buildBankFactorAssessment(profile) {
  const raw = {
    socialMedia: scoreSocialMedia(profile.socialMedia),
    businessAge: scoreBusinessAge(profile.businessAge),
    cibil: scoreCibil(profile.cibil),
    itr: scoreItr(profile.itr),
    balanceSheet: scoreBalanceSheet(profile.balanceSheet),
    provisionalBalanceSheet: scoreProvisionalBalanceSheet(profile.provisionalBalanceSheet, profile.balanceSheet),
    gst: scoreGst(profile.gstProfile),
    ownership: scoreOwnership(profile.ownership),
    bankAccounts: scoreBankAccounts(profile.bankAccounts),
    googleRating: scoreGoogleRating(profile.googleRating),
    onlineReviews: scoreOnlineReviews(profile.onlineReviews),
    location: scoreLocation(profile.location),
    competition: scoreCompetition(profile.competition),
  };

  const FACTORS = [
    { key: "cibil", label: "CIBIL Score", value: profile.cibil.score, unit: "" },
    { key: "gst", label: "GST Standing", value: profile.gstProfile.returnFilingConsistencyPct, unit: "%" },
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
    { key: "competition", label: "Competitive Position", value: profile.competition.estimatedMarketSharePct, unit: "% share" },
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
