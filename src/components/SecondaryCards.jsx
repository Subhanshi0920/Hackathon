import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { FileText, Wallet, Sparkles } from "lucide-react";
import {
  DsCard,
  DsCardContent,
  DsBox,
  DsStack,
  DsTypography,
  DsButton,
  PALETTE,
} from "@am92/react-design-system";
import { useAppData } from "../data/DataContext.jsx";
import { Stat } from "./Small.jsx";

export function TurnoverCard() {
  const {
    TURNOVER,
    MONTHS,
    computeAverageMonthlyTurnoverLakhs,
    computeYoYGrowthPct,
  } = useAppData();
  const data = TURNOVER.map((v, i) => ({ m: MONTHS[i], v }));
  const avgTurnover = computeAverageMonthlyTurnoverLakhs();
  const yoyGrowth = computeYoYGrowthPct();

  return (
    <DsCard variant="outlined" sx={{ height: "100%" }}>
      <DsCardContent>
        <DsStack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 1.5 }}
        >
          <FileText size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">
            GST Turnover Trend
          </DsTypography>
        </DsStack>

        <DsBox sx={{ height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 0, left: -28, bottom: 0 }}
            >
              <XAxis
                dataKey="m"
                tick={{ fill: PALETTE.secondaryGrey70, fontSize: 9.5 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis hide />
              <Bar dataKey="v" radius={[3, 3, 0, 0]} fill={PALETTE.primary} />
            </BarChart>
          </ResponsiveContainer>
        </DsBox>

        <DsStack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
          <Stat label="12-mo avg" value={`₹${avgTurnover}L`} />
          <Stat
            label="YoY growth"
            value={`${yoyGrowth >= 0 ? "+" : ""}${yoyGrowth}%`}
            color={yoyGrowth >= 0 ? PALETTE.successGreen : PALETTE.errorRed}
          />
        </DsStack>
      </DsCardContent>
    </DsCard>
  );
}

const RANGE_CACHE_PREFIX = "workingCapitalRangeCache:";

function readRangeCache(key) {
  try {
    const raw = localStorage.getItem(RANGE_CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeRangeCache(key, value) {
  try {
    localStorage.setItem(RANGE_CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // best-effort cache; ignore quota/private-mode failures
  }
}

// body: JSON.stringify({
//           prompt:
//             "You are a credit underwriting assistant for a bank's SME lending desk. Reply with ONLY one valid JSON object, with no preamble, markdown, or code fence. Use exactly these keys: recommended_loan_amount_min_lakhs, recommended_loan_amount_max_lakhs. " +
//             "Both must be numbers describing a conservative working-capital facility range (not a term-loan valuation), with recommended_loan_amount_max_lakhs never exceeding calculated_working_capital_ceiling_lakhs, and recommended_loan_amount_min_lakhs never greater than recommended_loan_amount_max_lakhs; narrow and lower the range when risk signals require it. " +
//             "Data: " +
//             JSON.stringify({
//               calculated_working_capital_ceiling_lakhs: rec.amountLakhs,
//               facility_type: rec.facilityType,
//               tenure_months: rec.tenureMonths,
//               supporting_signals: rec.bullets,
//             }),
//         }),

export function WorkingCapitalCard() {
  const { computeWorkingCapitalRecommendation } = useAppData();
  const rec = computeWorkingCapitalRecommendation();
  const cacheKey = JSON.stringify({
    amountLakhs: rec.amountLakhs,
    facilityType: rec.facilityType,
    tenureMonths: rec.tenureMonths,
    bullets: rec.bullets,
  });
  const [range, setRange] = useState(() => readRangeCache(cacheKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function generateRange() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const cached = readRangeCache(cacheKey);
      if (cached) {
        setRange(cached);
        return;
      }

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
                  "You are a credit underwriting assistant for a bank's SME lending desk. Reply with ONLY one valid JSON object, with no preamble, markdown, or code fence. Use exactly these keys: recommended_loan_amount_min_lakhs, recommended_loan_amount_max_lakhs. " +
                  "Both must be numbers describing a conservative working-capital facility range (not a term-loan valuation), with recommended_loan_amount_max_lakhs never exceeding calculated_working_capital_ceiling_lakhs, and recommended_loan_amount_min_lakhs never greater than recommended_loan_amount_max_lakhs; narrow and lower the range when risk signals require it. " +
                  "Data: " +
                  JSON.stringify({
                    calculated_working_capital_ceiling_lakhs: rec.amountLakhs,
                    facility_type: rec.facilityType,
                    tenure_months: rec.tenureMonths,
                    supporting_signals: rec.bullets,
                  }),
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
        typeof parsed.recommended_loan_amount_min_lakhs !== "number" ||
        typeof parsed.recommended_loan_amount_max_lakhs !== "number" ||
        parsed.recommended_loan_amount_min_lakhs < 0 ||
        parsed.recommended_loan_amount_min_lakhs >
          parsed.recommended_loan_amount_max_lakhs ||
        parsed.recommended_loan_amount_max_lakhs > rec.amountLakhs
      ) {
        throw new Error("The AI response had an invalid loan recommendation.");
      }

      writeRangeCache(cacheKey, parsed);
      setRange(parsed);
    } catch (err) {
      setError("Could not generate a recommendation — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DsCard variant="outlined" sx={{ height: "100%" }}>
      <DsCardContent>
        <DsStack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 1.5 }}
        >
          <Wallet size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">
            Working Capital Recommendation
          </DsTypography>
        </DsStack>

        <DsTypography variant="displayBoldSmall" sx={{ color: "primary.main" }}>
          ₹{rec.amountLakhs}L
        </DsTypography>
        <DsTypography
          variant="supportRegularMetadata"
          color="text.secondary"
          sx={{ mb: 1.5 }}
        >
          {rec.facilityType} · {rec.tenureMonths}-month tenure
        </DsTypography>

        <DsStack
          component="ul"
          spacing={0.5}
          sx={{ pl: 2.25, m: 0, listStyle: "disc" }}
        >
          {rec.bullets.map((b) => (
            <DsTypography key={b} component="li" variant="supportRegularInfo">
              {b}
            </DsTypography>
          ))}
        </DsStack>

        {range && (
          <DsBox sx={{ mt: 1.5 }}>
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              AI-recommended range
            </DsTypography>
            <DsTypography
              variant="headingBoldExtraSmall"
              sx={{ color: PALETTE.primary }}
            >
              ₹{range.recommended_loan_amount_min_lakhs}L – ₹
              {range.recommended_loan_amount_max_lakhs}L
            </DsTypography>
          </DsBox>
        )}
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
          onClick={generateRange}
          loading={loading}
          variant="contained"
          color="primary"
          startIcon={<Sparkles size={14} />}
          sx={{ mt: 2.5 }}
        >
          {loading ? "Generating…" : "Generate Loan Range"}
        </DsButton>
      </DsCardContent>
    </DsCard>
  );
}
