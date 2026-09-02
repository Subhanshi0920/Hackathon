import { useEffect, useState } from "react";
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

// The AI call goes to /api/v1/chat/completions — a serverless passthrough
// (see api/v1/chat/completions.js) that injects the OpenRouter key server-side.
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

export default function HealthScoreCard() {
  const {
    TURNOVER,
    FILING_STATUS,
    CASHFLOW,
    FALLBACK_INSIGHT,
    computeCompliancePct,
    computeYoYGrowthPct,
    computeBuyerConcentration,
    describeCashFlowModel,
    computeWorkingCapitalRecommendation,
    computeAverageMonthlyTurnoverLakhs,
  } = useAppData();

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

      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openrouter/free",
          temperature: 0,
          messages: [
            {
              role: "user",
              content:
                "You are a credit underwriting assistant for a bank's SME lending desk. Reply with ONLY one valid JSON object, with no preamble, markdown, or code fence. Use exactly these keys: score, band, narrative, recommended_loan_amount_min_lakhs, recommended_loan_amount_max_lakhs. " +
                "Compute score deterministically with this exact rubric, do not guess: start at 50; add (gst_compliance_pct * 0.3); add (clamp(turnover_yoy_growth_pct, -20, 20) * 0.5); subtract (top_buyer_concentration_pct / 100 * 15); subtract 10 if any value in stressed_case_cash_flow_lakhs is negative; clamp the result to 0-100 and round to the nearest integer. " +
                "band must be 'Healthy — Fundable' if score >= 75, 'Stable — Monitor' if score >= 55, 'Caution — Review' if score >= 35, else 'High Risk — Decline'. " +
                "narrative must be 2-3 plain-English sentences for a loan officer referencing the specific data. " +
                "recommended_loan_amount_min_lakhs and recommended_loan_amount_max_lakhs must both be numbers describing a conservative working-capital facility range (not a term-loan valuation), with recommended_loan_amount_max_lakhs never exceeding calculated_working_capital_ceiling_lakhs, and recommended_loan_amount_min_lakhs never greater than recommended_loan_amount_max_lakhs; narrow the range and lower it when risk signals require it. " +
                "Data: " +
                JSON.stringify(metrics),
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Status: ${res.status}`);

      const data = await res.json();
      const resultText = data.choices?.[0]?.message?.content ?? "";
      const jsonStart = resultText.indexOf("{");
      const jsonEnd = resultText.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd <= jsonStart) {
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
      sx={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <DsCardContent sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <DsStack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 2.5 }}
        >
          <ShieldCheck size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">
            AI Business Health Score
          </DsTypography>
        </DsStack>

        <DsStack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ mb: 2.5 }}
        >
          <ScoreGauge score={displayedInsight.score} />
          <DsBox>
            <DsTypography variant="displayBoldSmall">
              {displayedInsight.score}
            </DsTypography>
            <DsTypography
              variant="bodyBoldSmall"
              sx={{ color: PALETTE.successGreen }}
            >
              {displayedInsight.band}
            </DsTypography>
          </DsBox>
        </DsStack>

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
          sx={{ mt: 2.5, width: "fit-content" }}
        >
          {loading
            ? "Analyzing filings…"
            : generated && !isStale
              ? "Regenerate insight"
              : "Generate AI insight"}
        </DsButton>
      </DsCardContent>
    </DsCard>
  );
}
