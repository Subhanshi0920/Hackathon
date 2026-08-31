import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, AlertTriangle, Info } from "lucide-react";
import { DsCard, DsCardContent, DsBox, DsStack, DsTypography, PALETTE } from "@am92/react-design-system";
import { useAppData } from "../data/DataContext.jsx";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <DsBox sx={{ borderRadius: 1.5, px: 1.5, py: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
      <DsTypography variant="bodyBoldSmall" sx={{ mb: 0.5 }}>{label}</DsTypography>
      {row.actual != null && (
        <DsTypography variant="supportRegularMetadata" sx={{ color: PALETTE.primary }}>Actual: ₹{row.actual}L</DsTypography>
      )}
      {row.base != null && (
        <>
          <DsTypography variant="supportRegularMetadata" sx={{ color: PALETTE.tertiary100, display: "block" }}>Base: ₹{row.base}L</DsTypography>
          <DsTypography variant="supportRegularMetadata" color="text.secondary" sx={{ display: "block" }}>
            Range: ₹{row.low}L to ₹{row.high}L
          </DsTypography>
        </>
      )}
    </DsBox>
  );
}

export default function CashFlowCard() {
  const { CASHFLOW, describeCashFlowModel } = useAppData();

  // recharts trick for a shaded band: stack a transparent "low" area, then a
  // visible "high - low" area on top of it, so only the gap between the two
  // gets filled. Computed per-render, since CASHFLOW changes when the user
  // submits new GST/bank data.
  const chartData = CASHFLOW.map((c) => ({
    ...c,
    bandBase: c.low,
    bandHeight: c.low != null && c.high != null ? +(c.high - c.low).toFixed(2) : null,
  }));

  const dip = chartData.find((c) => c.base !== null && c.base < 0);
  const model = describeCashFlowModel();

  return (
    <DsCard variant="outlined" sx={{ height: "100%" }}>
      <DsCardContent>
        <DsStack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <DsStack direction="row" spacing={1} alignItems="center">
            <TrendingUp size={16} color={PALETTE.primary} />
            <DsTypography variant="headingBoldExtraSmall">Cash-Flow Forecast</DsTypography>
          </DsStack>
          <DsTypography variant="supportRegularMetadata" color="text.secondary">₹ lakhs, net monthly</DsTypography>
        </DsStack>

        <DsBox sx={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PALETTE.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={PALETTE.secondaryGrey20} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: PALETTE.secondaryGrey70, fontSize: 11 }} axisLine={{ stroke: PALETTE.secondaryGrey30 }} tickLine={false} />
              <YAxis tick={{ fill: PALETTE.secondaryGrey70, fontSize: 11 }} axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke={PALETTE.errorRed} strokeDasharray="2 3" />
              <Tooltip content={<CustomTooltip />} />

              {/* Actual, bank-confirmed cash flow */}
              <Area type="monotone" dataKey="actual" stroke={PALETTE.primary} strokeWidth={2} fill="url(#actualFill)" connectNulls name="Actual" />

              {/* Confidence band: invisible base + visible fill on top of it */}
              <Area type="monotone" dataKey="bandBase" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area type="monotone" dataKey="bandHeight" stackId="band" stroke="none" fill={PALETTE.tertiary100} fillOpacity={0.15} isAnimationActive={false} />

              {/* Base-case forecast line */}
              <Line type="monotone" dataKey="base" stroke={PALETTE.tertiary100} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls name="Base forecast" />
            </ComposedChart>
          </ResponsiveContainer>
        </DsBox>

        {dip && (
          <DsStack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, px: 1.5, py: 1, borderRadius: 1.5, bgcolor: PALETTE.errorRedNeutralLight, border: "1px solid", borderColor: "error.main" }}>
            <AlertTriangle size={13} color={PALETTE.errorRed} style={{ flexShrink: 0 }} />
            <DsTypography variant="supportRegularInfo">
              Base-case forecast dips negative in <strong>{dip.m}</strong> — see range band for best/worst case.
            </DsTypography>
          </DsStack>
        )}

        <DsStack direction="row" spacing={1} sx={{ mt: 1.5, px: 1.5, py: 1, borderRadius: 1.5, bgcolor: PALETTE.secondaryGrey10 }}>
          <Info size={13} color={PALETTE.secondaryGrey70} style={{ flexShrink: 0, marginTop: 2 }} />
          <DsTypography variant="supportRegularMetadata" color="text.secondary">
            Model: receipts typically land <strong>{model.lagMonths} month{model.lagMonths === 1 ? "" : "s"}</strong> after
            invoicing, at a <strong>{model.collectionRatePct}%</strong> collection rate — calibrated from this
            business's own bank history. {model.stressAssumption}
          </DsTypography>
        </DsStack>
      </DsCardContent>
    </DsCard>
  );
}