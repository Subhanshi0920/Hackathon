import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Percent, Wallet, CalendarClock, TrendingUp } from "lucide-react";
import {
  DsCard,
  DsCardContent,
  DsBox,
  DsStack,
  DsTypography,
  DsSlider,
  DsGrid,
  DsDivider,
  PALETTE,
} from "@am92/react-design-system";
import { useAppData } from "../data/DataContext.jsx";
import { computeLoanMath } from "../data/loanMath.js";

// Interest rate is NOT derived from uploaded documents — it stays at this
// standard policy rate regardless of what GST/bank data is loaded, per the
// requirement to keep the "current" rate untouched by uploads.
const DEFAULT_RATE_PCT = 12;
const RATE_MIN = 8;
const RATE_MAX = 24;
const RATE_STEP = 0.25;

const AMOUNT_MIN = 1;
const TENURE_MIN = 3;
const TENURE_MAX_CAP = 36;

function formatLakhs(value) {
  return `₹${value.toFixed(2)}L`;
}

/** One slider, grouped in its own bordered block with an icon + live value. */
function SliderField({ icon, label, value, displayValue, min, max, minLabel, maxLabel, step, onChange, valueLabelFormat }) {
  return (
    <DsBox sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
      <DsStack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <DsStack direction="row" spacing={1} alignItems="center">
          <DsBox sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 1, bgcolor: PALETTE.secondaryGrey10 }}>
            {icon}
          </DsBox>
          <DsTypography variant="bodyBoldSmall">{label}</DsTypography>
        </DsStack>
        <DsTypography variant="headingBoldExtraSmall" sx={{ color: "primary.main" }}>
          {displayValue}
        </DsTypography>
      </DsStack>

      <DsSlider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        valueLabelDisplay="auto"
        valueLabelFormat={valueLabelFormat}
        sx={{ mb: 0.5 }}
      />
      <DsStack direction="row" justifyContent="space-between">
        <DsTypography variant="supportRegularMetadata" color="text.secondary">{minLabel}</DsTypography>
        <DsTypography variant="supportRegularMetadata" color="text.secondary">{maxLabel}</DsTypography>
      </DsStack>
    </DsBox>
  );
}

export function InterestCalculatorCard() {
  const { computeWorkingCapitalRecommendation, CASHFLOW } = useAppData();

  // Recomputed every render — cheap, and needed both to size the sliders
  // and to detect (below) when the underlying documents have changed.
  const rec = computeWorkingCapitalRecommendation();

  const amountMax = Math.max(50, Math.ceil(rec.amountLakhs * 3));
  const tenureMax = Math.max(TENURE_MAX_CAP, rec.tenureMonths);

  const [amount, setAmount] = useState(rec.amountLakhs);
  const [tenure, setTenure] = useState(rec.tenureMonths);
  const [rate, setRate] = useState(DEFAULT_RATE_PCT);

  // CASHFLOW is a stable reference for as long as the loaded documents
  // haven't changed — it changes identity only when the user submits a new
  // GST/bank upload. We use that to know when to re-derive the amount/
  // tenure defaults from fresh data. Interest rate is deliberately excluded
  // — it never auto-resets. This is React's documented pattern for
  // "adjusting state when a prop changes": call setState directly in the
  // render body, guarded by a condition, rather than in an effect.
  const [defaultsSnapshot, setDefaultsSnapshot] = useState(CASHFLOW);
  if (defaultsSnapshot !== CASHFLOW) {
    setDefaultsSnapshot(CASHFLOW);
    setAmount(rec.amountLakhs);
    setTenure(rec.tenureMonths);
  }

  const { avgMonthlyInterestLakhs, totalRepaymentLakhs, totalInterestLakhs } = computeLoanMath(amount, rate, tenure);

  const donutData = [
    { name: "Principal", value: amount },
    { name: "Interest", value: totalInterestLakhs },
  ];
  const DONUT_COLORS = [PALETTE.primary, PALETTE.warningOrange];

  return (
    <DsCard variant="outlined">
      <DsCardContent>
        <DsStack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Percent size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">Interest Calculator</DsTypography>
        </DsStack>
        <DsTypography variant="supportRegularMetadata" color="text.secondary" sx={{ mb: 3, display: "block" }}>
          Amount and tenure default from this business's GST/bank data. Interest compounds monthly on the full
          principal, matching this facility's interest-only draw structure — drag any slider to explore other terms.
        </DsTypography>

        <DsGrid container spacing={3}>
          {/* Left: sliders */}
          <DsGrid size={{ xs: 12, md: 6 }}>
            <DsStack spacing={2}>
              <SliderField
                icon={<Wallet size={13} color={PALETTE.primary} />}
                label="Loan Amount"
                value={amount}
                displayValue={formatLakhs(amount)}
                min={AMOUNT_MIN}
                max={amountMax}
                minLabel={`₹${AMOUNT_MIN}L`}
                maxLabel={`₹${amountMax}L`}
                step={0.5}
                onChange={(_, v) => setAmount(v)}
                valueLabelFormat={(v) => `₹${v}L`}
              />
              <SliderField
                icon={<Percent size={13} color={PALETTE.primary} />}
                label="Interest Rate"
                value={rate}
                displayValue={`${rate.toFixed(2)}%`}
                min={RATE_MIN}
                max={RATE_MAX}
                minLabel={`${RATE_MIN}%`}
                maxLabel={`${RATE_MAX}%`}
                step={RATE_STEP}
                onChange={(_, v) => setRate(v)}
                valueLabelFormat={(v) => `${v}%`}
              />
              <SliderField
                icon={<CalendarClock size={13} color={PALETTE.primary} />}
                label="Tenure"
                value={tenure}
                displayValue={`${tenure} mo`}
                min={TENURE_MIN}
                max={tenureMax}
                minLabel={`${TENURE_MIN} mo`}
                maxLabel={`${tenureMax} mo`}
                step={1}
                onChange={(_, v) => setTenure(v)}
                valueLabelFormat={(v) => `${v}mo`}
              />
            </DsStack>
          </DsGrid>

          {/* Right: results, in parallel with the sliders */}
          <DsGrid size={{ xs: 12, md: 6 }}>
            <DsBox sx={{ height: "100%", p: 2.5, borderRadius: 1.5, bgcolor: PALETTE.secondaryGrey10 }}>
              <DsStack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                <TrendingUp size={13} color={PALETTE.secondaryGrey70} />
                <DsTypography variant="supportRegularMetadata" color="text.secondary">Avg. Monthly Interest</DsTypography>
              </DsStack>
              <DsTypography variant="displayBoldMedium" sx={{ color: "primary.main", mb: 2 }}>
                {formatLakhs(avgMonthlyInterestLakhs)}
              </DsTypography>

              <DsStack direction="row" spacing={2.5} alignItems="center" sx={{ mb: 2 }}>
                <DsBox sx={{ width: 110, height: 110, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" innerRadius={32} outerRadius={50} paddingAngle={2} stroke="none">
                        {donutData.map((entry, i) => (
                          <Cell key={entry.name} fill={DONUT_COLORS[i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </DsBox>

                <DsStack spacing={1}>
                  <DsStack direction="row" spacing={0.75} alignItems="center">
                    <DsBox sx={{ width: 9, height: 9, borderRadius: 0.5, bgcolor: "primary.main" }} />
                    <DsBox>
                      <DsTypography variant="bodyBoldSmall">{formatLakhs(amount)}</DsTypography>
                      <DsTypography variant="supportRegularMetadata" color="text.secondary">Principal</DsTypography>
                    </DsBox>
                  </DsStack>
                  <DsStack direction="row" spacing={0.75} alignItems="center">
                    <DsBox sx={{ width: 9, height: 9, borderRadius: 0.5, bgcolor: PALETTE.warningOrange }} />
                    <DsBox>
                      <DsTypography variant="bodyBoldSmall" sx={{ color: PALETTE.warningOrange }}>
                        {formatLakhs(totalInterestLakhs)}
                      </DsTypography>
                      <DsTypography variant="supportRegularMetadata" color="text.secondary">Interest</DsTypography>
                    </DsBox>
                  </DsStack>
                </DsStack>
              </DsStack>

              <DsDivider sx={{ mb: 1.5 }} />

              <DsStack direction="row" justifyContent="space-between">
                <DsTypography variant="supportRegularMetadata" color="text.secondary">Total Repayment</DsTypography>
                <DsTypography variant="bodyBoldSmall">{formatLakhs(totalRepaymentLakhs)}</DsTypography>
              </DsStack>
            </DsBox>
          </DsGrid>
        </DsGrid>
      </DsCardContent>
    </DsCard>
  );
}