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
