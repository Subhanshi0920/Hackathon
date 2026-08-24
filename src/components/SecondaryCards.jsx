import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { FileText, Wallet, Link2, ArrowUpRight } from "lucide-react";
import {
  DsCard,
  DsCardContent,
  DsBox,
  DsStack,
  DsTypography,
  DsButton,
  DsChip,
  PALETTE,
} from "@am92/react-design-system";
import {
  TURNOVER,
  MONTHS,
  CONNECTORS,
  computeAverageMonthlyTurnoverLakhs,
  computeYoYGrowthPct,
  computeWorkingCapitalRecommendation,
} from "../data/calculations.js";
import { Stat } from "./Small.jsx";

export function TurnoverCard() {
  const data = TURNOVER.map((v, i) => ({ m: MONTHS[i], v }));
  const avgTurnover = computeAverageMonthlyTurnoverLakhs();
  const yoyGrowth = computeYoYGrowthPct();

  return (
    <DsCard variant="outlined" sx={{ height: "100%" }}>
      <DsCardContent>
        <DsStack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <FileText size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">GST Turnover Trend</DsTypography>
        </DsStack>

        <DsBox sx={{ height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="m" tick={{ fill: PALETTE.secondaryGrey70, fontSize: 9.5 }} axisLine={false} tickLine={false} interval={1} />
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

export function WorkingCapitalCard() {
  const rec = computeWorkingCapitalRecommendation();

  return (
    <DsCard variant="outlined" sx={{ height: "100%", borderColor: "primary.main" }}>
      <DsCardContent>
        <DsStack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Wallet size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">Working Capital Recommendation</DsTypography>
        </DsStack>

        <DsTypography variant="displayBoldSmall" sx={{ color: "primary.main" }}>
          ₹{rec.amountLakhs}L
        </DsTypography>
        <DsTypography variant="supportRegularMetadata" color="text.secondary" sx={{ mb: 1.5 }}>
          {rec.facilityType} · {rec.tenureMonths}-month tenure
        </DsTypography>

        <DsStack component="ul" spacing={0.5} sx={{ pl: 2.25, m: 0, listStyle: "disc" }}>
          {rec.bullets.map((b) => (
            <DsTypography key={b} component="li" variant="supportRegularInfo">
              {b}
            </DsTypography>
          ))}
        </DsStack>

        <DsButton variant="contained" color="primary" fullWidth endIcon={<ArrowUpRight size={14} />} sx={{ mt: 2.5 }}>
          Send offer
        </DsButton>
      </DsCardContent>
    </DsCard>
  );
}

export function ConnectorsCard() {
  return (
    <DsCard variant="outlined" sx={{ height: "100%" }}>
      <DsCardContent>
        <DsStack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Link2 size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">Connected Sources</DsTypography>
        </DsStack>

        <DsStack spacing={1}>
          {CONNECTORS.map((c) => (
            <DsStack
              key={c.name}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: c.connected ? "success.main" : "divider",
                bgcolor: c.connected ? PALETTE.successGreenNeutralLight : "transparent",
              }}
            >
              <DsBox>
                <DsTypography variant="bodyBoldSmall">{c.name}</DsTypography>
                <DsTypography variant="supportRegularMetadata" color="text.secondary">
                  {c.desc}
                </DsTypography>
              </DsBox>
              <DsChip label={c.connected ? "Connected" : "Connect"} color={c.connected ? "success" : "default"} size="small" />
            </DsStack>
          ))}
        </DsStack>
      </DsCardContent>
    </DsCard>
  );
}