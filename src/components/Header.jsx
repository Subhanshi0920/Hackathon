import { Landmark } from "lucide-react";
import {
  DsBox,
  DsStack,
  DsTypography,
  DsSelect,
  DsChip,
} from "@am92/react-design-system";

export default function Header({ business, businesses, onBusinessChange }) {
  return (
    <DsStack
      direction="row"
      flexWrap="wrap"
      justifyContent="space-between"
      alignItems="center"
      gap={2}
      sx={{
        pb: 3,
        mb: 3,
        borderBottom: "1px solid",
        borderColor: "divider",
        px: { xs: 3, md: 5 },
      }}
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

      <DsStack direction="row" spacing={2} alignItems="flex-start">
        <DsBox sx={{ minWidth: 200 }}>
          <DsSelect
            size="small"
            value={business.gstin}
            onChange={(event) => onBusinessChange(event.target.value)}
            options={businesses.map((b) => ({ label: b.name, value: b.gstin }))}
            sx={{
              width: "250px",
            }}
          />
          <DsTypography
            variant="supportRegularMetadata"
            color="text.secondary"
            py={2}
            px={1}
          >
            GSTIN {business.gstin}
          </DsTypography>
        </DsBox>
      </DsStack>
    </DsStack>
  );
}
