import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { FileText, Wallet, Link2, ArrowUpRight } from "lucide-react";
import { alpha } from "@mui/material/styles";
import { DsCard, DsCardContent, DsBox, DsStack, DsTypography, DsButton, PALETTE } from "@am92/react-design-system";
import { TURNOVER, MONTHS, CONNECTORS } from "../data/calculations.js";
import { Stat } from "./Small.jsx";

export function TurnoverCard() {
  const data = TURNOVER.map((v, i) => ({ m: MONTHS[i], v }));
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
              <YAxis hide domain={[0, "dataMax"]} />
              <Bar dataKey="v" radius={[3, 3, 0, 0]} fill={PALETTE.primary} />
            </BarChart>
          </ResponsiveContainer>
        </DsBox>
        <DsStack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
          <Stat label="12-mo avg" value="₹10.0L" />
          <Stat label="YoY growth" value="+18%" color={PALETTE.successGreen} />
        </DsStack>
      </DsCardContent>
    </DsCard>
  );
}

export function WorkingCapitalCard() {
  return (
    <DsCard variant="outlined" sx={{ height: "100%", borderColor: "primary.main", bgcolor: alpha(PALETTE.primary, 0.03) }}>
      <DsCardContent>
        <DsStack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Wallet size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">Working Capital Recommendation</DsTypography>
        </DsStack>
        <DsTypography variant="displayBoldSmall" color="primary.main">₹8.0L</DsTypography>
        <DsTypography variant="supportRegularInfo" color="text.secondary" sx={{ mb: 1.5 }}>
          Overdraft facility · 12-month tenure
        </DsTypography>
        <DsBox component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
          <DsTypography component="li" variant="supportRegularInfo">Covers projected Dec shortfall with buffer</DsTypography>
          <DsTypography component="li" variant="supportRegularInfo">Sized to 0.8× average monthly turnover</DsTypography>
          <DsTypography component="li" variant="supportRegularInfo">Interest-only draws against filed GST invoices</DsTypography>
        </DsBox>
        <DsButton variant="contained" color="primary" fullWidth endIcon={<ArrowUpRight size={14} />} sx={{ mt: 1.5 }}>
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
                <DsTypography variant="supportRegularMetadata" color="text.secondary">{c.desc}</DsTypography>
              </DsBox>
              <DsTypography
                variant="supportRegularMetadata"
                sx={{ color: c.connected ? "success.main" : "text.secondary" }}
              >
                {c.connected ? "Connected" : "Connect"}
              </DsTypography>
            </DsStack>
          ))}
        </DsStack>
      </DsCardContent>
    </DsCard>
  );
}
