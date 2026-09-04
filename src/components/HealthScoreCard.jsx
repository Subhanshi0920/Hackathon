import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import {
  DsCard,
  DsCardContent,
  DsBox,
  DsStack,
  DsTypography,
  DsButton,
  PALETTE,
} from "@am92/react-design-system";
import { ScoreGauge } from "./Small.jsx";
import { useAppData } from "../data/DataContext.jsx";
import {
  getBusinessRiskProfileByGstin,
  buildBankFactorAssessment,
} from "../data/bankFactors.js";

function scoreColor(score) {
  return score >= 75
    ? PALETTE.successGreen
    : score >= 55
      ? "#C9962C"
      : score >= 35
        ? "#D97B29"
        : PALETTE.errorRed;
}

// The AI call is routed through the /api/ai/generate dev-server proxy (see
// vite.config.js) so the OpenRouter key stays server-side.
const CACHE_PREFIX = "healthInsightCache:";

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage can be unavailable (private mode, quota) — caching is a
    // nice-to-have, not worth failing the insight over.
  }
}

export default function HealthScoreCard({ gstin }) {
  const {
    TURNOVER,
    FILING_STATUS,
    CASHFLOW,
    FALLBACK_INSIGHT: FINANCIAL_INSIGHT,
    computeCompliancePct,
    computeYoYGrowthPct,
    computeBuyerConcentration,
    describeCashFlowModel,
    computeWorkingCapitalRecommendation,
    computeAverageMonthlyTurnoverLakhs,
    computeTotalTurnoverLakhs,
    TOP_BUYERS,
  } = useAppData();

  // Beyond-financials signals (CIBIL, ITR, balance sheet, GST standing,
  // ownership, bank conduct, reputation, location, competition, ...) — see
  // bankFactors.js. Blended with the GST/cash-flow financial score below so
  // the Health Score reflects everything a bank looks at.
  const bankProfile = getBusinessRiskProfileByGstin(gstin);
  const bankAssessment = bankProfile
    ? buildBankFactorAssessment(bankProfile)
    : null;

  const FALLBACK_INSIGHT = useMemo(() => {
    if (!bankAssessment) return FINANCIAL_INSIGHT;
    const score = Math.round(
      FINANCIAL_INSIGHT.score * 0.5 + bankAssessment.overallScore * 0.5,
    );
    const band =
      score >= 75
        ? "Healthy — Fundable"
        : score >= 55
          ? "Stable — Monitor"
          : score >= 35
            ? "Caution — Review"
            : "High Risk — Decline";
    const narrative =
      `${FINANCIAL_INSIGHT.narrative} On the ${bankAssessment.FACTORS.length} beyond-financials signals banks weigh ` +
      `(CIBIL, ITR, balance sheet trend, GST standing, ownership, banking conduct, ratings/reviews, location and competition), ` +
      `the business scores ${bankAssessment.overallScore}/100 (${bankAssessment.band}).`;
    return { score, band, narrative };
  }, [FINANCIAL_INSIGHT, bankAssessment]);

  const [insight, setInsight] = useState(FALLBACK_INSIGHT);
  // Tracks which FALLBACK_INSIGHT the current `insight` was generated
  // against. If the user submits a new GST/bank upload, FALLBACK_INSIGHT is
  // a new object (recomputed from the new data) — when that happens we want
  // to show the fresh deterministic score, not a stale AI answer computed
  // from the old data. Comparing during render avoids an extra render pass
  // just to reset state.
  const [insightFor, setInsightFor] = useState(FALLBACK_INSIGHT);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState(null);

  const isStale = insightFor !== FALLBACK_INSIGHT;
  const displayedInsight = isStale ? FALLBACK_INSIGHT : insight;

  const compliancePct = computeCompliancePct();
  const dip = CASHFLOW.find((c) => c.base !== null && c.base < 0);

  // Mirrors the exact rubric computeHealthScore() uses in calculations.js
  // (and that the AI prompt is instructed to follow too) — presentational
  // only, so the score has a visible "why" instead of being a black box.
  const yoyGrowthPct = computeYoYGrowthPct();
  const concentration = computeBuyerConcentration();
  const clampedGrowth = Math.max(-20, Math.min(20, yoyGrowthPct));
  const scoreBreakdown = [
    { label: "Base score", value: 50 },
    {
      label: `GST compliance (${compliancePct}% on-time)`,
      value: compliancePct * 0.3,
    },
    {
      label: `YoY turnover growth (${yoyGrowthPct >= 0 ? "+" : ""}${yoyGrowthPct}%, capped \u00b120%)`,
      value: clampedGrowth * 0.5,
    },
    {
      label: `Buyer concentration (${concentration.topBuyerPct}% top buyer)`,
      value: -(concentration.topBuyerPct / 100) * 15,
    },
    {
      label: dip ? "Stressed cash-flow dip" : "No stressed cash-flow dip",
      value: dip ? -10 : 0,
    },
  ];

  if (bankAssessment) {
    scoreBreakdown.push({
      label: `Bank-perspective signals blend (${bankAssessment.overallScore}/100, weighted 50%)`,
      value: (bankAssessment.overallScore - FINANCIAL_INSIGHT.score) * 0.5,
    });
  }

  function buildMetrics() {
    const concentration = computeBuyerConcentration();
    const model = describeCashFlowModel();
    const workingCapitalRecommendation = computeWorkingCapitalRecommendation();
    return {
      turnover_trend_lakhs: TURNOVER,
      filing_status_last_12_months: FILING_STATUS,
      gst_compliance_pct: compliancePct,
      turnover_yoy_growth_pct: computeYoYGrowthPct(),
      top_buyer_concentration_pct: concentration.topBuyerPct,
      top5_buyer_concentration_pct: concentration.top5Pct,
      cash_flow_model_lag_months: model.lagMonths,
      cash_flow_model_collection_rate_pct: model.collectionRatePct,
      base_case_cash_flow_lakhs: CASHFLOW.map((c) => c.base ?? c.actual),
      stressed_case_cash_flow_lakhs: CASHFLOW.map((c) => c.low ?? c.actual),
      projected_shortfall_month: dip ? dip.m : null,
      average_monthly_turnover_lakhs: computeAverageMonthlyTurnoverLakhs(),
      calculated_working_capital_ceiling_lakhs:
        workingCapitalRecommendation.amountLakhs,
      bank_confidence_score: bankAssessment?.overallScore ?? null,
      bank_confidence_band: bankAssessment?.band ?? null,
      bank_confidence_factors:
        bankAssessment?.FACTORS.map((f) => ({
          label: f.label,
          score: f.score,
          weight: f.weight,
        })) ?? null,
    };
  }

  // If the current GST/bank data already has a cached AI insight (from an
  // earlier click, possibly before a page refresh), show it immediately
  // instead of forcing a fresh API call.
  useEffect(() => {
    const cached = readCache(JSON.stringify(buildMetrics()));
    if (cached) {
      setInsight(cached);
      setInsightFor(FALLBACK_INSIGHT);
      setGenerated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [FALLBACK_INSIGHT]);

  async function generateInsight() {
    // if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const metrics = buildMetrics();
      const cacheKey = JSON.stringify(metrics);
      const cached = readCache(cacheKey);
      if (cached) {
        setInsight(cached);
        setInsightFor(FALLBACK_INSIGHT);
        setGenerated(true);
        return;
      }

      const res = await fetch(
        `${window.location.origin}/api/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            // Removed HTTP-Referer/Title headers as they can trigger preflight CORS fails
          },
          body: JSON.stringify({
            model: "openrouter/free",
            temperature: 0,
            messages: [
              {
                role: "user",
                content:
                  "You are a credit underwriting assistant for a bank's SME lending desk. Reply with ONLY one valid JSON object, with no preamble, markdown, or code fence. Use exactly these keys: score, band, narrative, recommended_loan_amount_min_lakhs, recommended_loan_amount_max_lakhs. " +
                  "Compute a financial_score deterministically with this exact rubric, do not guess: start at 50; add (gst_compliance_pct * 0.3); add (clamp(turnover_yoy_growth_pct, -20, 20) * 0.5); subtract (top_buyer_concentration_pct / 100 * 15); subtract 10 if any value in stressed_case_cash_flow_lakhs is negative; clamp the result to 0-100. " +
                  "If bank_confidence_score is not null, set score = round(financial_score * 0.5 + bank_confidence_score * 0.5); otherwise score = round(financial_score). " +
                  "band must be 'Healthy — Fundable' if score >= 75, 'Stable — Monitor' if score >= 55, 'Caution — Review' if score >= 35, else 'High Risk — Decline'. " +
                  "narrative must be 2-3 plain-English sentences for a loan officer referencing the specific data, and when bank_confidence_score is not null it must reference bank_confidence_band and the weakest entries in bank_confidence_factors. " +
                  "recommended_loan_amount_min_lakhs and recommended_loan_amount_max_lakhs must both be numbers describing a conservative working-capital facility range (not a term-loan valuation), with recommended_loan_amount_max_lakhs never exceeding calculated_working_capital_ceiling_lakhs, and recommended_loan_amount_min_lakhs never greater than recommended_loan_amount_max_lakhs; narrow the range and lower it when risk signals require it. " +
                  "Data: " +
                  JSON.stringify(metrics),
              },
            ],
          }),
        },
      );
      if (!res.ok) throw new Error(`Status: ${res.status}`);

      const data = await res.json();
      console.log("Proxy execution succeeded:", data);
      const resultText = data.choices?.[0]?.message?.content ?? "";
      const jsonStart = resultText.indexOf("{");
      const jsonEnd = resultText.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd <= jsonStart) {
        // setInsight(FALLBACK_INSIGHT);
        throw new Error("The AI response did not contain a JSON object.");
      }

      const parsed = JSON.parse(resultText.slice(jsonStart, jsonEnd + 1));

      writeCache(cacheKey, parsed);
      setInsight(parsed);
      setInsightFor(FALLBACK_INSIGHT);
      setGenerated(true);
    } catch (err) {
      console.error("[HealthScoreCard] AI insight request failed:", err);
      setError(
        "Couldn't reach the AI service — showing a sample insight instead.",
      );
      setInsight(FALLBACK_INSIGHT);
      setInsightFor(FALLBACK_INSIGHT);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DsCard
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <DsBox
        sx={{
          px: 2.5,
          py: 2.25,
          background: `linear-gradient(135deg, ${scoreColor(displayedInsight.score)} 0%, #1F5F5B 100%)`,
        }}
      >
        <DsStack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <DsBox
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255,255,255,0.18)",
            }}
          >
            <ShieldCheck size={17} color="#fff" />
          </DsBox>
          <DsTypography variant="headingBoldExtraSmall" sx={{ color: "#fff" }}>
            AI Business Health Score
          </DsTypography>
        </DsStack>

        <DsStack direction="row" spacing={2.5} alignItems="center">
          <ScoreGauge score={displayedInsight.score} light />
          <DsBox>
            <DsTypography variant="displayBoldSmall" sx={{ color: "#fff" }}>
              {displayedInsight.score}
              <DsTypography
                component="span"
                variant="bodyRegularSmall"
                sx={{ color: "rgba(255,255,255,0.75)" }}
              >
                {" "}
                /100
              </DsTypography>
            </DsTypography>
            <DsBox
              sx={{
                display: "inline-flex",
                mt: 0.5,
                px: 1.25,
                py: 0.4,
                borderRadius: 5,
                bgcolor: "rgba(255,255,255,0.18)",
              }}
            >
              <DsTypography variant="bodyBoldSmall" sx={{ color: "#fff" }}>
                {displayedInsight.band}
              </DsTypography>
            </DsBox>
          </DsBox>
        </DsStack>
      </DsBox>

      <DsCardContent sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <DsTypography
          variant="bodyRegularSmall"
          color="text.secondary"
          sx={{ flex: 1, maxHeight: "fit-content" }}
        >
          {displayedInsight.narrative}
        </DsTypography>

        {error && !isStale && (
          <DsTypography
            variant="supportRegularMetadata"
            color="error.main"
            sx={{ mt: 1 }}
          >
            {error}
          </DsTypography>
        )}

        <DsButton
          onClick={generateInsight}
          loading={loading}
          variant="contained"
          color="primary"
          startIcon={<Sparkles size={14} />}
          sx={{ mt: 2.5, width: "fit-content", borderRadius: 2 }}
        >
          {loading
            ? "Analyzing filings…"
            : generated && !isStale
              ? "Regenerate insight"
              : "Generate AI insight"}
        </DsButton>

        <DsBox
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2.5,
            bgcolor: PALETTE.secondaryGrey10,
          }}
        >
          <DsTypography variant="bodyBoldSmall" sx={{ mb: 1.5 }}>
            Score breakdown
          </DsTypography>
          <DsStack spacing={1}>
            {scoreBreakdown.map((row) => (
              <DsStack
                key={row.label}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: "background.paper",
                }}
              >
                <DsTypography
                  variant="supportRegularInfo"
                  color="text.secondary"
                >
                  {row.label}
                </DsTypography>
                <DsTypography
                  variant="supportRegularInfo"
                  sx={{
                    fontWeight: 600,
                    color:
                      row.value >= 0 ? PALETTE.successGreen : PALETTE.errorRed,
                    flexShrink: 0,
                    ml: 2,
                  }}
                >
                  {row.value >= 0 ? "+" : ""}
                  {row.value.toFixed(1)}
                </DsTypography>
              </DsStack>
            ))}
          </DsStack>
        </DsBox>

        {bankAssessment && (
          <DsBox
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <DsStack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <DsTypography variant="bodyBoldSmall">
                Bank-perspective signals
              </DsTypography>
              <DsBox
                sx={{
                  px: 1.25,
                  py: 0.4,
                  borderRadius: 5,
                  bgcolor: `${scoreColor(bankAssessment.overallScore)}22`,
                }}
              >
                <DsTypography
                  variant="supportRegularMetadata"
                  sx={{
                    color: scoreColor(bankAssessment.overallScore),
                    fontWeight: 600,
                  }}
                >
                  {bankAssessment.overallScore}/100 · {bankAssessment.band}
                </DsTypography>
              </DsBox>
            </DsStack>
            <DsStack spacing={1.25}>
              {bankAssessment.FACTORS.slice()
                .sort((a, b) => b.weight - a.weight)
                .map((f) => (
                  <DsBox key={f.key}>
                    <DsStack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 0.5 }}
                    >
                      <DsTypography
                        variant="supportRegularInfo"
                        color="text.secondary"
                      >
                        {f.label}
                      </DsTypography>
                      <DsStack direction="row" spacing={1} alignItems="center">
                        <DsTypography
                          variant="supportRegularInfo"
                          sx={{ fontWeight: 600 }}
                        >
                          {f.score}
                        </DsTypography>
                        <DsTypography
                          variant="supportRegularMetadata"
                          color="text.secondary"
                        >
                          ({f.weight}%)
                        </DsTypography>
                      </DsStack>
                    </DsStack>
                    <DsBox
                      sx={{
                        height: 5,
                        borderRadius: 3,
                        bgcolor: PALETTE.secondaryGrey10,
                        overflow: "hidden",
                      }}
                    >
                      <DsBox
                        sx={{
                          height: "100%",
                          width: `${Math.max(f.score, 2)}%`,
                          borderRadius: 3,
                          bgcolor: scoreColor(f.score),
                        }}
                      />
                    </DsBox>
                  </DsBox>
                ))}
            </DsStack>
          </DsBox>
        )}

        <DsBox
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2.5,
            bgcolor: PALETTE.secondaryGrey10,
          }}
        >
          <DsStack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1.5 }}
          >
            <DsTypography variant="bodyBoldSmall">
              Buyer concentration
            </DsTypography>
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              top 5: {concentration.top5Pct}%
            </DsTypography>
          </DsStack>
          <DsStack spacing={1}>
            {TOP_BUYERS.slice(0, 3).map((b) => {
              const pct = Math.round(
                (b.valueLakhs / computeTotalTurnoverLakhs()) * 100,
              );
              return (
                <DsStack
                  key={b.buyerName}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    px: 1.25,
                    py: 0.75,
                    borderRadius: 1.5,
                    bgcolor: "background.paper",
                  }}
                >
                  <DsTypography variant="supportRegularInfo">
                    {b.buyerName}
                  </DsTypography>
                  <DsTypography
                    variant="supportRegularInfo"
                    color="text.secondary"
                  >
                    ₹{b.valueLakhs}L · {pct}%
                  </DsTypography>
                </DsStack>
              );
            })}
          </DsStack>
        </DsBox>
      </DsCardContent>
    </DsCard>
  );
}
