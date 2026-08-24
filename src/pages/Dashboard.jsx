/**
 * Dashboard page to show GST filing, health score, cash flow, turnover, working capital and connectors cards
 */
import { DsBox, DsGrid, DsTypography, PALETTE } from "@am92/react-design-system";
import Header from "../components/Header.jsx";
import FilingPulse from "../components/FilingPulse.jsx";
import HealthScoreCard from "../components/HealthScoreCard.jsx";
import CashFlowCard from "../components/CashFlowCard.jsx";
import { TurnoverCard, WorkingCapitalCard, ConnectorsCard } from "../components/SecondaryCards.jsx";

export default function Dashboard() {
  return (
    <DsBox sx={{ minHeight: "100vh", bgcolor: PALETTE.secondaryGrey10 }}>
      <DsBox sx={{ maxWidth: 1180, mx: "auto", px: { xs: 3, md: 5 }, py: { xs: 3, md: 4 } }}>
        <Header />

        <FilingPulse />

        <DsGrid container spacing={2.5} sx={{ mb: 2.5 }}>
          <DsGrid size={{ xs: 12, md: 4 }}>
            <HealthScoreCard />
          </DsGrid>
          <DsGrid size={{ xs: 12, md: 8 }}>
            <CashFlowCard />
          </DsGrid>
        </DsGrid>

        <DsGrid container spacing={2.5}>
          <DsGrid size={{ xs: 12, md: 4 }}>
            <TurnoverCard />
          </DsGrid>
          <DsGrid size={{ xs: 12, md: 4 }}>
            <WorkingCapitalCard />
          </DsGrid>
          <DsGrid size={{ xs: 12, md: 4 }}>
            <ConnectorsCard />
          </DsGrid>
        </DsGrid>

        <DsTypography variant="supportRegularMetadata" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
          Demo data — for hackathon presentation purposes only.
        </DsTypography>
      </DsBox>
    </DsBox>
  );
}
