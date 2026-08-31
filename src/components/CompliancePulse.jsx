import { useAppData } from "../data/DataContext.jsx";
import {
  DsCard,
  DsCardContent,
  DsStack,
  DsBox,
  DsTypography,
} from "@am92/react-design-system";
import { Legend } from "./Small.jsx";

const FILING_COLOR = {
  on: "#3FA796",
  late: "#C9962C",
  missed: "#E0554F",
};

const PAYMENT_COLOR = {
  Paid: "#3FA796",
  "Paid Late": "#C9962C",
  "Partially Paid": "#D97B29",
  Overdue: "#E0554F",
};

export default function CompliancePulse() {
  const { MONTHS, FILING_STATUS, PAYMENT_STATUS, computeCompliancePct, computePaymentCompliancePct, computeTotalOutstandingTaxLakhs } = useAppData();
  const filingPct = computeCompliancePct();
  const paymentPct = computePaymentCompliancePct();
  const outstandingLakhs = computeTotalOutstandingTaxLakhs();

  return (
    <DsCard variant="outlined" sx={{ mb: 3 }}>
      <DsCardContent>
        <DsStack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 3 }}
        >
          <DsBox>
            <DsTypography variant="headingBoldExtraSmall">
              12-Month Compliance Pulse
            </DsTypography>
            <DsTypography
              variant="supportRegularInfo"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              GSTR-3B filing and payment, month by month
            </DsTypography>
          </DsBox>
          <DsBox sx={{ textAlign: "right" }}>
            <DsTypography variant="headingBoldMedium" color="primary.main">
              {filingPct}%
            </DsTypography>
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              filed on-time
            </DsTypography>
          </DsBox>
          <DsBox sx={{ textAlign: "right" }}>
            <DsTypography variant="headingBoldMedium" color="primary.main">
              {paymentPct}%
            </DsTypography>
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              paid on-time
            </DsTypography>
          </DsBox>
        </DsStack>
        <DsStack direction="row" alignItems="flex-end" spacing={1.5}>
          <DsStack
            direction="column"
            spacing={1}
            sx={{ height: 64, justifyContent: "flex-start", flexShrink: 0 }}
          >
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
              sx={{ height: 22, display: "flex", alignItems: "center" }}
            >
              Filing
            </DsTypography>
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
              sx={{ height: 22, display: "flex", alignItems: "center" }}
            >
              Payment
            </DsTypography>
          </DsStack>

          <DsStack
            direction="row"
            alignItems="flex-end"
            spacing={1.5}
            sx={{ flex: 1, height: 64 }}
          >
            {MONTHS.map((m, i) => {
              const filingStatus = FILING_STATUS[i];
              const paymentStatus = PAYMENT_STATUS[i];
              return (
                <DsBox
                  key={i}
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <DsStack
                    direction="column"
                    spacing={1}
                    sx={{ width: "100%" }}
                  >
                    <DsBox
                      sx={{
                        height: 22,
                        borderRadius: 0.5,
                        bgcolor: FILING_COLOR[filingStatus],
                        opacity: 0.9,
                      }}
                      title={`Filing: ${filingStatus}`}
                    />
                    <DsBox
                      sx={{
                        height: 22,
                        borderRadius: 0.5,
                        bgcolor: PAYMENT_COLOR[paymentStatus],
                        opacity: 0.9,
                      }}
                      title={`Payment: ${paymentStatus}`}
                    />
                  </DsStack>
                  <DsTypography
                    variant="supportRegularMetadata"
                    color="text.secondary"
                  >
                    {m}
                  </DsTypography>
                </DsBox>
              );
            })}
          </DsStack>
        </DsStack>

        <DsStack
          direction="row"
          alignItems="flex-start"
          spacing={6}
          sx={{ mt: 3, flexWrap: "wrap" }}
        >
          <DsBox>
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              Filing
            </DsTypography>
            <DsStack direction="row" spacing={3} sx={{ mt: 3 }}>
              <Legend color="#3FA796" label="On time" />
              <Legend color="#C9962C" label="Late" />
              <Legend color="#E0554F" label="Missed" />
            </DsStack>
          </DsBox>
          <DsBox>
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              Payment
            </DsTypography>
            <DsStack direction="row" spacing={3} sx={{ mt: 3 }}>
              <Legend color="#3FA796" label="Paid" />
              <Legend color="#C9962C" label="Paid late" />
              <Legend color="#D97B29" label="Partially paid" />
              <Legend color="#E0554F" label="Overdue" />
            </DsStack>
          </DsBox>
        </DsStack>

        {outstandingLakhs > 0 && (
          <DsTypography
            variant="supportRegularMetadata"
            color="text.secondary"
            sx={{ mt: 3 }}
          >
            ₹{outstandingLakhs.toFixed(2)}L in GST is currently outstanding
            against filed liability.
          </DsTypography>
        )}
      </DsCardContent>
    </DsCard>
  );
}