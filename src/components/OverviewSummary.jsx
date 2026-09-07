import {
  Activity,
  BadgeIndianRupee,
  ChartNoAxesCombined,
  Radar,
  Users,
  Share2,
  CalendarClock,
  Gauge,
  FileCheck2,
  TrendingUpDown,
  Landmark,
  ReceiptText,
  Wallet2,
  Star,
  MapPinned,
  Swords,
  ArrowLeftRight,
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
import { useAppData } from "../data/DataContext.jsx";
import { buildBankFactorAssessment } from "../data/bankFactors.js";

// Icon per bank-factor key, matching the iconography used on the Risk
// Factors tab so the same signals are recognizable across tabs.
const FACTOR_ICONS = {
  cibil: Gauge,
  gst: Wallet2,
  itr: ReceiptText,
  balanceSheet: FileCheck2,
  provisionalBalanceSheet: TrendingUpDown,
  businessAge: CalendarClock,
  bankAccounts: Landmark,
  googleRating: Star,
  socialMedia: Share2,
  ownership: Users,
  location: MapPinned,
  competition: Swords,
  salesChannelReconciliation: ArrowLeftRight,
};

function scoreColor(score) {
  return score >= 75
    ? PALETTE.successGreen
    : score >= 55
      ? "#C9962C"
      : score >= 35
        ? "#D97B29"
        : PALETTE.errorRed;
}

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
    CASHFLOW,
    computeCompliancePct,
    computeYoYGrowthPct,
    computeBuyerConcentration,
    getRiskProfile,
    offlineSales,
    computeAverageMonthlyTurnoverLakhs,
  } = useAppData();

  const bankProfile = getRiskProfile(gstin);
  const compliancePct = computeCompliancePct();
  const bankAssessment = bankProfile
    ? buildBankFactorAssessment(bankProfile, {
        liveGstCompliancePct: compliancePct,
        offlineSalesMonthly: offlineSales?.monthly,
      })
    : null;

  const yoyGrowthPct = computeYoYGrowthPct();
  const concentration = computeBuyerConcentration();

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
            icon={BadgeIndianRupee}
            label="Bank Signals Tracked"
            value={bankAssessment ? bankAssessment.FACTORS.length : 0}
            sub="Breakdown below"
          />
        </DsGrid>
      </DsGrid>

      {bankAssessment && (
        <DsCard variant="outlined">
          <DsCardContent>
            <DsStack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <DsTypography variant="headingBoldExtraSmall">
                Bank Confidence — Full Risk Factor Breakdown
              </DsTypography>
              <DsTypography
                variant="supportRegularMetadata"
                color="text.secondary"
              >
                {bankAssessment.overallScore}/100 · {bankAssessment.band}
              </DsTypography>
            </DsStack>
            <DsGrid container spacing={2}>
              {bankAssessment.FACTORS.slice()
                .sort((a, b) => b.weight - a.weight)
                .map((f) => {
                  const Icon = FACTOR_ICONS[f.key] || Radar;
                  return (
                    <DsGrid key={f.key} size={{ xs: 12, sm: 6, lg: 3 }}>
                      <DsBox
                        sx={{
                          height: "100%",
                          p: 1.5,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <DsStack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mb: 0.75 }}
                        >
                          <DsStack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                          >
                            <Icon size={14} color={PALETTE.primary} />
                            <DsTypography variant="supportRegularInfo">
                              {f.label}
                            </DsTypography>
                          </DsStack>
                          <DsTypography
                            variant="supportRegularMetadata"
                            color="text.secondary"
                          >
                            {f.weight}%
                          </DsTypography>
                        </DsStack>
                        <DsTypography
                          variant="bodyBoldSmall"
                          sx={{ color: scoreColor(f.score), mb: 0.5 }}
                        >
                          {f.score}/100
                        </DsTypography>
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
                    </DsGrid>
                  );
                })}
            </DsGrid>
          </DsCardContent>
        </DsCard>
      )}
    </DsStack>
  );
}
