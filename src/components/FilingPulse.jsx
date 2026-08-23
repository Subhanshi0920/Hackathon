import { DsCard, DsCardContent, DsBox, DsStack, DsTypography, PALETTE } from "@am92/react-design-system";
import { MONTHS, FILING_STATUS } from "../data/calculations.js";
import { Legend } from "./Small.jsx";

export default function FilingPulse() {
  const onTimeCount = FILING_STATUS.filter((s) => s === "on").length;
  const compliancePct = Math.round((onTimeCount / FILING_STATUS.length) * 100);

  return (
    <DsCard variant="outlined" sx={{ mb: 3 }}>
      <DsCardContent>
        <DsStack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
          <DsBox>
            <DsTypography variant="headingBoldExtraSmall">12-Month Filing Pulse</DsTypography>
            <DsTypography variant="supportRegularInfo" color="text.secondary" sx={{ mt: 0.5 }}>
              Every GSTR-3B filing, on schedule or not
            </DsTypography>
          </DsBox>
          <DsBox sx={{ textAlign: "right" }}>
            <DsTypography variant="headingBoldMedium" color="primary.main">
              {compliancePct}%
            </DsTypography>
            <DsTypography variant="supportRegularMetadata" color="text.secondary">
              on-time compliance
            </DsTypography>
          </DsBox>
        </DsStack>

        <DsStack direction="row" alignItems="flex-end" spacing={1.5} sx={{ height: 64 }}>
          {FILING_STATUS.map((s, i) => {
            const color = s === "on" ? PALETTE.tertiary100 : s === "late" ? PALETTE.primary : PALETTE.errorRed;
            const h = s === "on" ? 54 : s === "late" ? 38 : 20;
            return (
              <DsBox key={i} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <DsBox sx={{ width: "100%", height: h, borderRadius: 0.5, bgcolor: color, opacity: 0.9 }} />
                <DsTypography variant="supportRegularMetadata" color="text.secondary">
                  {MONTHS[i]}
                </DsTypography>
              </DsBox>
            );
          })}
        </DsStack>

        <DsStack direction="row" spacing={3} sx={{ mt: 3 }}>
          <Legend color={PALETTE.tertiary100} label="Filed on time" />
          <Legend color={PALETTE.primary} label="Filed late" />
          <Legend color={PALETTE.errorRed} label="Missed" />
        </DsStack>
      </DsCardContent>
    </DsCard>
  );
}
