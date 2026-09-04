import {
  Activity,
  BadgeIndianRupee,
  BrainCircuit,
  ChartNoAxesCombined,
  Radar,
  Users,
  WalletCards,
} from "lucide-react";
import {
  DsCard,
  DsCardContent,
  DsBox,
  DsStack,
  DsTypography,
  DsGrid,
  PALETTE,
} from "@am92/react-design-system";
import { ScoreGauge, Stat } from "./Small.jsx";
import { useAppData } from "../data/DataContext.jsx";
import {
  getBusinessRiskProfileByGstin,
  buildBankFactorAssessment,
} from "../data/bankFactors.js";

function SummaryTile({ icon: Icon, label, value, sub, color }) {
  return (
    <DsCard variant="outlined" sx={{ height: "100%" }}>
      <DsCardContent>
        <DsStack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Icon size={15} color={PALETTE.primary} />
          <DsTypography variant="bodyBoldSmall" color="text.secondary">
            {label}
          </DsTypography>
        </DsStack>
        <DsTypography
          variant="displayBoldSmall"
          sx={{ color: color || "text.primary" }}
        >
          {value}
        </DsTypography>
        {sub && (
          <DsTypography variant="supportRegularMetadata" color="text.secondary">
            {sub}
          </DsTypography>
        )}
      </DsCardContent>
    </DsCard>
  );
}

// One-glance rollup of every other tab — health/bank scores, cash flow,
// turnover and the recommended facility (GST compliance detail lives on the
// GST turnover tab).
export default function OverviewSummary({ gstin }) {
  const {
    FALLBACK_INSIGHT,
    computeYoYGrowthPct,
    computeBuyerConcentration,
    computeAverageMonthlyTurnoverLakhs,
    computeWorkingCapitalRecommendation,
    CASHFLOW,
  } = useAppData();

  const bankProfile = getBusinessRiskProfileByGstin(gstin);
  const bankAssessment = bankProfile
    ? buildBankFactorAssessment(bankProfile)
    : null;

  const yoyGrowthPct = computeYoYGrowthPct();
  const concentration = computeBuyerConcentration();
  const workingCapital = computeWorkingCapitalRecommendation();
  const latestCashFlow = [...CASHFLOW]
    .reverse()
    .find((c) => c.actual !== null || c.base !== null);
  const latestNet = latestCashFlow
    ? (latestCashFlow.actual ?? latestCashFlow.base)
    : null;

  return (
    <DsStack spacing={2.5}>
      <DsGrid container spacing={2.5}>
        <DsGrid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={BrainCircuit}
            label="Health Score"
            value={`${FALLBACK_INSIGHT.score}/100`}
            sub={FALLBACK_INSIGHT.band}
            color={
              FALLBACK_INSIGHT.score >= 75
                ? PALETTE.successGreen
                : FALLBACK_INSIGHT.score >= 55
                  ? "#C9962C"
                  : PALETTE.errorRed
            }
          />
        </DsGrid>
        <DsGrid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={Radar}
            label="Bank Confidence"
            value={
              bankAssessment ? `${bankAssessment.overallScore}/100` : "N/A"
            }
            sub={bankAssessment?.band}
            color={
              bankAssessment && bankAssessment.overallScore >= 75
                ? PALETTE.successGreen
                : bankAssessment && bankAssessment.overallScore >= 55
                  ? "#C9962C"
                  : PALETTE.errorRed
            }
          />
        </DsGrid>
        <DsGrid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={ChartNoAxesCombined}
            label="Turnover Growth"
            value={`${yoyGrowthPct >= 0 ? "+" : ""}${yoyGrowthPct}%`}
            sub={`YoY, avg \u20b9${computeAverageMonthlyTurnoverLakhs()}L/mo`}
            color={yoyGrowthPct >= 0 ? PALETTE.successGreen : PALETTE.errorRed}
          />
        </DsGrid>
        <DsGrid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={Activity}
            label="Latest Net Cash Flow"
            value={latestNet != null ? `₹${latestNet}L` : "N/A"}
            sub={latestCashFlow?.m}
            color={
              latestNet != null && latestNet < 0
                ? PALETTE.errorRed
                : PALETTE.successGreen
            }
          />
        </DsGrid>
        <DsGrid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={Users}
            label="Buyer Concentration"
            value={`${concentration.topBuyerPct}%`}
            sub={concentration.topBuyerName}
            color={
              concentration.topBuyerPct >= 30 ? "#C9962C" : PALETTE.successGreen
            }
          />
        </DsGrid>
        <DsGrid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={WalletCards}
            label="Recommended Facility"
            value={`₹${workingCapital.amountLakhs}L`}
            sub={`${workingCapital.facilityType} · ${workingCapital.tenureMonths}mo`}
          />
        </DsGrid>
        <DsGrid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={BadgeIndianRupee}
            label="Bank Signals Tracked"
            value={bankAssessment ? bankAssessment.FACTORS.length : 0}
            sub="See Risk Factors tab for detail"
          />
        </DsGrid>
      </DsGrid>
    </DsStack>
  );
}
