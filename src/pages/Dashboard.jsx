/**
 * Dashboard page to show GST filing, health score, cash flow, turnover andworking capital
 */
import { useState } from "react";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  ChartNoAxesCombined,
  Radar,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  DsBox,
  DsStack,
  DsTypography,
  PALETTE,
} from "@am92/react-design-system";
import { AppDataProvider } from "../data/DataContext.jsx";
import Header from "../components/Header.jsx";
import OverviewSummary from "../components/OverviewSummary.jsx";
import CompliancePulse from "../components/CompliancePulse.jsx";
import HealthScoreCard from "../components/HealthScoreCard.jsx";
import CashFlowCard from "../components/CashFlowCard.jsx";
import {
  TurnoverCard,
  WorkingCapitalCard,
} from "../components/SecondaryCards.jsx";
import { BusinessSection } from "../components/BusinessSection.jsx";
import { RiskFactorsCard } from "../components/RiskFactorsCard.jsx";
import { InterestCalculatorCard } from "../components/InterestCalculatorCard.jsx";
import { BORROWERS, getBusinessProfileByGstin } from "../data/calculations.js";

// Bank-perspective dashboard only — every tab here answers "is this business
// safe to lend to", so the old per-user "Business" tab is now just one more
// bank-facing section rather than a separate user-mode view.
const tabs = [
  { id: "business", label: "Business", icon: UserRound },
  { id: "overview", label: "Overview", icon: Activity },
  { id: "risk", label: "Risk Factors", icon: Radar },
  { id: "health", label: "Health score", icon: BrainCircuit },
  { id: "cashflow", label: "Cash flow", icon: ChartNoAxesCombined },
  { id: "turnover", label: "GST & Compliance", icon: BarChart3 },
  { id: "facility", label: "Credit offer", icon: WalletCards },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("business");
  const [selectedBusinessGstin, setSelectedBusinessGstin] = useState(
    BORROWERS[0].gstin,
  );

  const selectedBusiness = BORROWERS.find(
    (business) => business.gstin === selectedBusinessGstin,
  );

  function renderContent() {
    switch (activeTab) {
      case "business":
        return (
          <BusinessSection
            profile={getBusinessProfileByGstin(selectedBusinessGstin)}
          />
        );
      case "risk":
        return <RiskFactorsCard gstin={selectedBusinessGstin} />;
      case "health":
        return <HealthScoreCard gstin={selectedBusinessGstin} />;
      case "cashflow":
        return <CashFlowCard />;
      case "turnover":
        return (
          <DsStack spacing={2.5}>
            <TurnoverCard />
            <CompliancePulse />
          </DsStack>
        );
      case "facility":
        return (
          <DsStack spacing={2.5}>
            <WorkingCapitalCard />
            <InterestCalculatorCard />
          </DsStack>
        );
      default:
        return <OverviewSummary gstin={selectedBusinessGstin} />;
    }
  }

  return (
    <AppDataProvider>
      <DsBox
        sx={{
          height: { xs: "auto", md: "100vh" },
          overflow: { xs: "visible", md: "hidden" },
          bgcolor: PALETTE.secondaryGrey10,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DsBox
          sx={{
            maxWidth: "100vw",
            width: "100%",
            mx: "auto",
            pt: { xs: 3, md: 2 },
            flexShrink: 0,
          }}
        >
          <Header
            business={selectedBusiness}
            businesses={BORROWERS}
            onBusinessChange={setSelectedBusinessGstin}
          />
        </DsBox>

        <DsStack
          direction={{ xs: "column", md: "row" }}
          spacing={2.5}
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: { xs: "visible", md: "hidden" },
          }}
        >
          <DsBox
            component="nav"
            aria-label="Dashboard sections"
            sx={{
              width: { md: 250 },
              flexShrink: 0,
              height: { xs: "auto", md: "100%" },
              overflowX: { xs: "auto", md: "visible" },
              overflowY: { md: "auto" },
              borderRight: { md: "1px solid" },
              borderColor: { md: "divider" },
            }}
          >
            <DsStack direction={{ xs: "column" }} spacing={1.5}>
              <DsStack direction={{ xs: "row", md: "column" }} spacing={2}>
                {tabs.map((tab) => {
                  const selected = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <DsBox
                      key={tab.id}
                      sx={{
                        justifyContent: "flex-start",
                        whiteSpace: "nowrap",
                        minWidth: { xs: "max-content", md: "100%" },
                        cursor: "pointer",
                        bgcolor: selected
                          ? "var(--ds-colour-actionPrimary)"
                          : "inherit",
                        color: selected
                          ? "primary.contrastText"
                          : "text.primary",
                        px: 8,
                        py: 1,
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        height: 40,
                      }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon size={18} />
                      {tab.label}
                    </DsBox>
                  );
                })}
              </DsStack>
            </DsStack>
          </DsBox>

          <DsBox
            sx={{
              flex: 1,
              minWidth: 0,
              height: { xs: "auto", md: "100%" },
              overflowY: { xs: "visible", md: "auto" },
              pr: { md: 1 },
              pb: { md: 3 },
            }}
          >
            <DsTypography variant="headingBoldSmall" sx={{ mb: 2 }}>
              {tabs.find((tab) => tab.id === activeTab)?.label}
            </DsTypography>
            {renderContent()}
          </DsBox>
        </DsStack>
      </DsBox>
    </AppDataProvider>
  );
}
