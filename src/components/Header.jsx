import { Landmark, CheckCircle2 } from "lucide-react";
import { DsBox, DsStack, DsTypography, DsChip } from "@am92/react-design-system";
import { BORROWER } from "../data/calculations.js";

export default function Header() {
  return (
    <DsStack
      direction="row"
      flexWrap="wrap"
      justifyContent="space-between"
      alignItems="center"
      gap={2}
      sx={{ pb: 3, mb: 3, borderBottom: "1px solid", borderColor: "divider" }}
    >
      <DsStack direction="row" spacing={1.5} alignItems="center">
        <DsBox
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: "primary.main",
          }}
        >
          <Landmark size={19} color="#fff" />
        </DsBox>
        <DsBox>
          <DsTypography variant="headingBoldSmall">CreditPulse</DsTypography>
          <DsTypography variant="supportRegularMetadata" color="text.secondary">
            SME Lending Intelligence
          </DsTypography>
        </DsBox>
      </DsStack>

      <DsStack direction="row" spacing={2} alignItems="center">
        <DsBox sx={{ textAlign: "right" }}>
          <DsTypography variant="bodyBoldSmall">{BORROWER.name}</DsTypography>
          <DsTypography variant="supportRegularMetadata" color="text.secondary">
            GSTIN {BORROWER.gstin}
          </DsTypography>
        </DsBox>
        <DsChip icon={<CheckCircle2 size={13} />} label="Live sync" color="success" size="small" />
      </DsStack>
    </DsStack>
  );
}
