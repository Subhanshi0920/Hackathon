import { Landmark, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DsBox,
  DsStack,
  DsTypography,
  DsButton,
} from "@am92/react-design-system";

export default function Header({ showReupload = false }) {
  const navigate = useNavigate();
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

      {showReupload && (
        <DsButton
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<Upload size={15} />}
          onClick={() => navigate("/upload")}
        >
          Re-upload documents
        </DsButton>
      )}
    </DsStack>
  );
}
