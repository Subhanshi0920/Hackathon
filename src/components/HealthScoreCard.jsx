import { useState } from "react";
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
import {
  TURNOVER,
  FILING_STATUS,
  CASHFLOW,
  FALLBACK_INSIGHT,
  computeCompliancePct,
  computeYoYGrowthPct,
  computeBuyerConcentration,
  describeCashFlowModel,
  computeAverageMonthlyTurnoverLakhs,
  computeWorkingCapitalRecommendation,
} from "../data/calculations.js";

export default function HealthScoreCard() {
  const [insight, setInsight] = useState(FALLBACK_INSIGHT);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState(null);

  const compliancePct = computeCompliancePct();
  const dip = CASHFLOW.find((c) => c.base !== null && c.base < 0);

  async function generateInsight() {
    setLoading(true);
    setError(null);
    const concentration = computeBuyerConcentration();
    const model = describeCashFlowModel();
    const workingCapitalRecommendation = computeWorkingCapitalRecommendation();
    const metrics = {
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

    try {
      const response = await fetch(
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
                  "Compute score deterministically with this exact rubric, do not guess: start at 50; add (gst_compliance_pct * 0.3); add (clamp(turnover_yoy_growth_pct, -20, 20) * 0.5); subtract (top_buyer_concentration_pct / 100 * 15); subtract 10 if any value in stressed_case_cash_flow_lakhs is negative; clamp the result to 0-100 and round to the nearest integer. " +
                  "band must be 'Healthy — Fundable' if score >= 75, 'Stable — Monitor' if score >= 55, 'Caution — Review' if score >= 35, else 'High Risk — Decline'. " +
                  "narrative must be 2-3 plain-English sentences for a loan officer referencing the specific data. " +
                  "recommended_loan_amount_min_lakhs and recommended_loan_amount_max_lakhs must both be numbers describing a conservative working-capital facility range (not a term-loan valuation), with recommended_loan_amount_max_lakhs never exceeding calculated_working_capital_ceiling_lakhs, and recommended_loan_amount_min_lakhs never greater than recommended_loan_amount_max_lakhs; narrow the range and lower it when risk signals require it. " +
                  "Data: " +
                  JSON.stringify(metrics),
              },
            ],
          }),
        },
      );

      if (!response.ok) throw new Error(`Status: ${response.status}`);

      const data = await response.json();
      console.log("Proxy execution succeeded:", data);
      const resultText = data.choices?.[0]?.message?.content ?? "";
      const jsonStart = resultText.indexOf("{");
      const jsonEnd = resultText.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd <= jsonStart) {
        // setInsight(FALLBACK_INSIGHT);
        throw new Error("The AI response did not contain a JSON object.");
      }

      const parsed = JSON.parse(resultText.slice(jsonStart, jsonEnd + 1));
      if (
        typeof parsed.score !== "number" ||
        typeof parsed.band !== "string" ||
        typeof parsed.narrative !== "string" ||
        typeof parsed.recommended_loan_amount_min_lakhs !== "number" ||
        typeof parsed.recommended_loan_amount_max_lakhs !== "number" ||
        parsed.recommended_loan_amount_min_lakhs < 0 ||
        parsed.recommended_loan_amount_min_lakhs >
          parsed.recommended_loan_amount_max_lakhs ||
        parsed.recommended_loan_amount_max_lakhs >
          workingCapitalRecommendation.amountLakhs
      ) {
        // setInsight(FALLBACK_INSIGHT);
        throw new Error("The AI response had an invalid loan recommendation.");
      }

      setInsight(parsed);
      setGenerated(true);
    } catch (error) {
      console.error("Proxy execution failed:", error);
      setError(
        "The AI returned an invalid response — showing the sample insight instead.",
      );
      // setInsight(FALLBACK_INSIGHT);
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
          <ScoreGauge score={insight.score} />
          <DsBox>
            <DsTypography variant="displayBoldSmall">
              {insight.score}
            </DsTypography>
            <DsTypography
              variant="bodyBoldSmall"
              sx={{ color: PALETTE.successGreen }}
            >
              {insight.band}
            </DsTypography>
          </DsBox>
        </DsStack>
        {generated && (
          <DsBox sx={{ mb: 2 }}>
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              Recommended working-capital facility
            </DsTypography>
            <DsTypography
              variant="headingBoldExtraSmall"
              sx={{ color: PALETTE.primary }}
            >
              ₹{insight.recommended_loan_amount_min_lakhs}L – ₹
              {insight.recommended_loan_amount_max_lakhs}L
            </DsTypography>
          </DsBox>
        )}
        <DsTypography
          variant="bodyRegularSmall"
          color="text.secondary"
          sx={{ flex: 1, maxHeight: "fit-content" }}
        >
          {insight.narrative}
        </DsTypography>
        {error && (
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
            : generated
              ? "Regenerate insight"
              : "Generate AI insight"}
        </DsButton>
      </DsCardContent>
    </DsCard>
  );
}
