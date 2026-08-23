import { useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { DsCard, DsCardContent, DsBox, DsStack, DsTypography, DsButton, PALETTE } from "@am92/react-design-system";
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
} from "../data/calculations.js";

// NOTE: This calls the Anthropic API directly from the browser. That's fine
// for a hackathon demo, but for production you'd proxy this through your
// own backend so the API key/auth isn't exposed client-side.
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
    try {
      const concentration = computeBuyerConcentration();
      const model = describeCashFlowModel();
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
      };

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content:
                "You are a credit underwriting assistant for a bank's SME lending desk. Given this SME's GST filing and cash-flow data, return ONLY a JSON object (no markdown, no preamble) with keys: score (integer 0-100, creditworthiness), band (a 2-4 word label like 'Healthy — Fundable'), narrative (2-3 plain-English sentences explaining the score for a loan officer, referencing the specific data). Data: " +
                JSON.stringify(metrics),
            },
          ],
        }),
      });

      const data = await res.json();
      const text = data.content?.find((b) => b.type === "text")?.text ?? "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setInsight(parsed);
      setGenerated(true);
    } catch (e) {
      setError("Couldn't reach the AI service — showing a sample insight instead.");
      setInsight(FALLBACK_INSIGHT);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DsCard variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <DsCardContent sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <DsStack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <ShieldCheck size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">AI Business Health Score</DsTypography>
        </DsStack>

        <DsStack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
          <ScoreGauge score={insight.score} />
          <DsBox>
            <DsTypography variant="displayBoldSmall">{insight.score}</DsTypography>
            <DsTypography variant="bodyBoldSmall" sx={{ color: PALETTE.successGreen }}>
              {insight.band}
            </DsTypography>
          </DsBox>
        </DsStack>

        <DsTypography variant="bodyRegularSmall" color="text.secondary" sx={{ flex: 1 }}>
          {insight.narrative}
        </DsTypography>

        {error && (
          <DsTypography variant="supportRegularMetadata" color="error.main" sx={{ mt: 1 }}>
            {error}
          </DsTypography>
        )}

        <DsButton
          onClick={generateInsight}
          loading={loading}
          variant="contained"
          color="primary"
          startIcon={<Sparkles size={14} />}
          sx={{ mt: 2.5 }}
        >
          {loading ? "Analyzing filings…" : generated ? "Regenerate insight" : "Generate AI insight"}
        </DsButton>
      </DsCardContent>
    </DsCard>
  );
}
