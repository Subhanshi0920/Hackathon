import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, AlertTriangle, Info } from "lucide-react";
import {
  DsCard,
  DsCardContent,
  DsBox,
  DsStack,
  DsTypography,
  PALETTE,
} from "@am92/react-design-system";
import { useAppData } from "../data/DataContext.jsx";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <DsBox
      sx={{
        borderRadius: 1.5,
        px: 1.5,
        py: 1,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <DsTypography variant="bodyBoldSmall" sx={{ mb: 0.5 }}>
        {label}
      </DsTypography>
      {row.actual != null && (
        <DsTypography
          variant="supportRegularMetadata"
          sx={{ color: PALETTE.primary }}
        >
          Actual: ₹{row.actual}L
        </DsTypography>
      )}
      {row.base != null && (
        <>
          <DsTypography
            variant="supportRegularMetadata"
            sx={{ color: PALETTE.tertiary100, display: "block" }}
          >
            Base: ₹{row.base}L
          </DsTypography>
          <DsTypography
            variant="supportRegularMetadata"
            color="text.secondary"
            sx={{ display: "block" }}
          >
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
    bandHeight:
      c.low != null && c.high != null ? +(c.high - c.low).toFixed(2) : null,
  }));

  const dip = chartData.find((c) => c.base !== null && c.base < 0);
  const model = describeCashFlowModel();

  return (
    <DsCard
      variant="outlined"
      sx={{ height: "100%", borderRadius: 3, overflow: "hidden" }}
    >
      <DsBox
        sx={{
          px: 2.5,
          py: 2,
          background: `linear-gradient(135deg, ${PALETTE.primary} 0%, #1F5F5B 100%)`,
        }}
      >
        <DsStack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          rowGap={1.5}
        >
          <DsStack direction="row" spacing={1.25} alignItems="center">
            <DsBox
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(255,255,255,0.18)",
              }}
            >
              <TrendingUp size={18} color="#fff" />
            </DsBox>
            <DsBox>
              <DsTypography
                variant="headingBoldExtraSmall"
                sx={{ color: "#fff" }}
              >
                Cash-Flow Forecast
              </DsTypography>
              <DsTypography
                variant="supportRegularMetadata"
                sx={{ color: "rgba(255,255,255,0.75)" }}
              >
                ₹ lakhs, net monthly
              </DsTypography>
            </DsBox>
          </DsStack>
          <DsStack direction="row" spacing={1.25}>
            <DsBox
              sx={{
                textAlign: "center",
                px: 1.75,
                py: 0.75,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              <DsTypography variant="bodyBoldSmall" sx={{ color: "#fff" }}>
                {model.lagMonths}mo
              </DsTypography>
              <DsTypography
                variant="supportRegularMetadata"
                sx={{ color: "rgba(255,255,255,0.75)" }}
              >
                collection lag
              </DsTypography>
            </DsBox>
            <DsBox
              sx={{
                textAlign: "center",
                px: 1.75,
                py: 0.75,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              <DsTypography variant="bodyBoldSmall" sx={{ color: "#fff" }}>
                {model.collectionRatePct}%
              </DsTypography>
              <DsTypography
                variant="supportRegularMetadata"
                sx={{ color: "rgba(255,255,255,0.75)" }}
              >
                collection rate
              </DsTypography>
            </DsBox>
          </DsStack>
        </DsStack>
      </DsBox>

      <DsCardContent>
        <DsBox sx={{ height: 220, mt: 0.5 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <defs>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={PALETTE.primary}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor={PALETTE.primary}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={PALETTE.secondaryGrey20}
                strokeDasharray="3 5"
                vertical={false}
              />
              <XAxis
                dataKey="m"
                tick={{ fill: PALETTE.secondaryGrey70, fontSize: 11 }}
                axisLine={{ stroke: PALETTE.secondaryGrey30 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: PALETTE.secondaryGrey70, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine
                y={0}
                stroke={PALETTE.errorRed}
                strokeDasharray="2 3"
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Actual, bank-confirmed cash flow */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke={PALETTE.primary}
                strokeWidth={2.5}
                fill="url(#actualFill)"
                connectNulls
                name="Actual"
              />

              {/* Confidence band: invisible base + visible fill on top of it */}
              <Area
                type="monotone"
                dataKey="bandBase"
                stackId="band"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="bandHeight"
                stackId="band"
                stroke="none"
                fill={PALETTE.tertiary100}
                fillOpacity={0.18}
                isAnimationActive={false}
              />

              {/* Base-case forecast line */}
              <Line
                type="monotone"
                dataKey="base"
                stroke={PALETTE.tertiary100}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 3 }}
                connectNulls
                name="Base forecast"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </DsBox>

        <DsStack
          direction="row"
          spacing={2}
          sx={{ mt: 1, mb: 1.5 }}
          flexWrap="wrap"
        >
          <DsStack direction="row" spacing={0.75} alignItems="center">
            <DsBox
              sx={{
                width: 18,
                height: 2.5,
                borderRadius: 1,
                bgcolor: PALETTE.primary,
              }}
            />
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              Actual
            </DsTypography>
          </DsStack>
          <DsStack direction="row" spacing={0.75} alignItems="center">
            <DsBox
              sx={{
                width: 18,
                height: 2.5,
                borderRadius: 1,
                bgcolor: PALETTE.tertiary100,
              }}
            />
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              Base forecast
            </DsTypography>
          </DsStack>
          <DsStack direction="row" spacing={0.75} alignItems="center">
            <DsBox
              sx={{
                width: 18,
                height: 10,
                borderRadius: 1,
                bgcolor: PALETTE.tertiary100,
                opacity: 0.3,
              }}
            />
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              Best/worst range
            </DsTypography>
          </DsStack>
        </DsStack>

        {dip && (
          <DsStack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              mt: 1,
              px: 1.5,
              py: 1,
              borderRadius: 2,
              bgcolor: PALETTE.errorRedNeutralLight,
              borderLeft: "3px solid",
              borderColor: "error.main",
            }}
          >
            <AlertTriangle
              size={13}
              color={PALETTE.errorRed}
              style={{ flexShrink: 0 }}
            />
            <DsTypography variant="supportRegularInfo">
              Base-case forecast dips negative in <strong>{dip.m}</strong> — see
              range band for best/worst case.
            </DsTypography>
          </DsStack>
        )}

        <DsStack
          direction="row"
          spacing={1}
          sx={{
            mt: 1.25,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: PALETTE.secondaryGrey10,
            borderLeft: "3px solid",
            borderColor: PALETTE.secondaryGrey30,
          }}
        >
          <Info
            size={13}
            color={PALETTE.secondaryGrey70}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <DsTypography variant="supportRegularMetadata" color="text.secondary">
            Model: receipts typically land{" "}
            <strong>
              {model.lagMonths} month{model.lagMonths === 1 ? "" : "s"}
            </strong>{" "}
            after invoicing, at a <strong>{model.collectionRatePct}%</strong>{" "}
            collection rate — calibrated from this business's own bank history.{" "}
            {model.stressAssumption}
          </DsTypography>
        </DsStack>

        <DsBox
          sx={{
            mt: 2.5,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <DsTypography variant="bodyBoldSmall" sx={{ mb: 1.25 }}>
            Monthly detail
          </DsTypography>
          <DsStack
            direction="row"
            spacing={1.25}
            sx={{ overflowX: "auto", pb: 1 }}
          >
            {chartData.map((c) => {
              const net = c.actual ?? c.base;
              const positive = net == null || net >= 0;
              return (
                <DsBox
                  key={c.period}
                  sx={{
                    flexShrink: 0,
                    minWidth: 128,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderTop: "3px solid",
                    borderTopColor: positive
                      ? PALETTE.successGreen
                      : PALETTE.errorRed,
                    px: 1.5,
                    py: 1.25,
                  }}
                >
                  <DsStack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 0.75 }}
                  >
                    <DsTypography variant="bodyBoldSmall">{c.m}</DsTypography>
                    {c.actual == null && (
                      <DsTypography
                        variant="supportRegularMetadata"
                        color="text.secondary"
                      >
                        fcst
                      </DsTypography>
                    )}
                  </DsStack>
                  <DsTypography
                    variant="bodyBoldSmall"
                    sx={{
                      color: positive ? PALETTE.successGreen : PALETTE.errorRed,
                      mb: 0.5,
                    }}
                  >
                    {net != null ? `₹${net}L` : "—"}
                  </DsTypography>
                  {c.low != null && c.high != null && (
                    <DsTypography
                      variant="supportRegularMetadata"
                      color="text.secondary"
                    >
                      ₹{c.low}L – ₹{c.high}L
                    </DsTypography>
                  )}
                </DsBox>
              );
            })}
          </DsStack>
        </DsBox>
      </DsCardContent>
    </DsCard>
  );
}
