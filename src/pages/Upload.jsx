/**
 * Upload gate — the user lands here first. The dashboard/graphs stay locked
 * until GSTR-1, GSTR-3B and the bank statement have all been uploaded and
 * submitted (DataUploadCard flips each source to "uploaded" in DataContext).
 *
 * Same shell as the dashboard (shared <Header/>), pink accents.
 */
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Users,
  FileText,
  Landmark,
  ShieldCheck,
  Activity,
  Radar,
  ChartNoAxesCombined,
  BarChart3,
  WalletCards,
} from "lucide-react";
import {
  DsBox,
  DsStack,
  DsTypography,
  DsButton,
  DsCard,
  DsCardContent,
  DsDivider,
} from "@am92/react-design-system";
import Header from "../components/Header.jsx";
import { DataUploadCard } from "../components/DataUploadCard.jsx";
import { RiskProfileForm } from "../components/RiskProfileForm.jsx";
import { RiskDocsCard } from "../components/RiskDocsCard.jsx";
import { useAppData } from "../data/DataContext.jsx";

const ACCENT = "#ec4899";
const ACCENT_DEEP = "#9d174d";
const ACCENT_SOFT = "#fce7f3";
const ACCENT_BORDER = "#fbcfe8";

const DOC_INFO = [
  {
    icon: Users,
    title: "GSTR-1 — Buyer Data",
    blurb:
      "Invoice-level sales by customer. Drives buyer-concentration risk and the top-buyer breakdown.",
  },
  {
    icon: FileText,
    title: "GSTR-3B — Filing Data",
    blurb:
      "Monthly turnover, tax paid and filing dates. Feeds the compliance score, turnover trend and YoY growth.",
  },
  {
    icon: Landmark,
    title: "Bank Statement",
    blurb:
      "Monthly receipts vs outflows. Powers the cash-flow forecast and the working-capital recommendation.",
  },
];

const NEXT_UP = [
  { icon: Activity, label: "Overview — headline score & summary" },
  { icon: Radar, label: "Risk Factors — 13 bank-perspective signals" },
  {
    icon: ChartNoAxesCombined,
    label: "Cash flow — calibrated forecast with stress case",
  },
  { icon: BarChart3, label: "GST & Compliance — filing and payment history" },
  { icon: WalletCards, label: "Credit offer — sized working-capital facility" },
];

export default function Upload() {
  const navigate = useNavigate();
  const { gstr1Source, gstSource, bankSource } = useAppData();

  const steps = [
    { label: "GSTR-1 (Buyer Data)", done: gstr1Source.kind === "uploaded" },
    { label: "GSTR-3B (Filing Data)", done: gstSource.kind === "uploaded" },
    { label: "Bank Statement", done: bankSource.kind === "uploaded" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const ready = doneCount === steps.length;

  return (
    <DsBox sx={{ minHeight: "100vh", bgcolor: "#fff" }}>
      <DsBox sx={{ width: "100%" }}>
        <DsBox sx={{ pt: { xs: 3, md: 2 } }}>
          <Header />
        </DsBox>

        <DsBox sx={{ px: { xs: 3, md: 5 }, pb: 8 }}>
          {/* Page title */}
          <DsStack spacing={1} sx={{ mb: 4 }}>
            <DsTypography variant="headingBoldMedium">
              Upload documents
            </DsTypography>
            <DsTypography variant="bodyRegularMedium" color="text.secondary">
              Credit Pulse builds a full bank-style credit view from three
              filings. The dashboard stays locked until all three are uploaded.
            </DsTypography>
          </DsStack>

          {/* Progress bar */}
          <DsBox sx={{ mb: 4 }}>
            <DsStack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <DsTypography variant="bodyBoldSmall">
                Upload progress
              </DsTypography>
              <DsTypography
                variant="supportRegularMetadata"
                sx={{ color: ACCENT_DEEP, fontWeight: 600 }}
              >
                {doneCount} of {steps.length} complete
              </DsTypography>
            </DsStack>
            <DsBox
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: ACCENT_SOFT,
                overflow: "hidden",
              }}
            >
              <DsBox
                sx={{
                  height: "100%",
                  width: `${(doneCount / steps.length) * 100}%`,
                  bgcolor: ACCENT,
                  transition: "width .3s ease",
                }}
              />
            </DsBox>
          </DsBox>

          {/* Body: upload on the left, guidance on the right */}
          <DsBox
            sx={{
              display: "grid",
              gap: { xs: 3, md: 4 },
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 340px" },
              alignItems: "start",
            }}
          >
            {/* Left — the upload card + checklist */}
            <DsStack spacing={3}>
              <DataUploadCard />

              <RiskDocsCard />

              <RiskProfileForm />

              <DsStack direction="row" spacing={1.25} alignItems="flex-start">
                <ShieldCheck
                  size={15}
                  color={ACCENT}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <DsTypography variant="bodyRegularSmall" color="text.secondary">
                  Files are parsed entirely in your browser — nothing is sent to
                  a server. Use the template download on each row to see the
                  exact columns expected.
                </DsTypography>
              </DsStack>

              <DsBox>
                <DsButton
                  variant="contained"
                  disabled={!ready}
                  endIcon={<ArrowRight size={16} />}
                  onClick={() => navigate("/dashboard")}
                  sx={{
                    px: 3.5,
                    py: 1.25,
                    bgcolor: ACCENT,
                    "&:hover": { bgcolor: ACCENT_DEEP },
                  }}
                >
                  {ready ? "View dashboard" : "Upload all 3 to continue"}
                </DsButton>
              </DsBox>
            </DsStack>

            {/* Right — guidance rail */}
            <DsStack spacing={3}>
              <DsCard variant="outlined">
                <DsCardContent>
                  <DsTypography variant="bodyBoldSmall" sx={{ mb: 2 }}>
                    What each file is for
                  </DsTypography>
                  <DsStack divider={<DsDivider />} spacing={2}>
                    {DOC_INFO.map((d) => {
                      const Icon = d.icon;
                      return (
                        <DsStack
                          key={d.title}
                          direction="row"
                          spacing={1.5}
                          alignItems="flex-start"
                          sx={{ pt: 0 }}
                        >
                          <DsBox
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 30,
                              height: 30,
                              borderRadius: 1,
                              bgcolor: ACCENT_SOFT,
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={15} color={ACCENT_DEEP} />
                          </DsBox>
                          <DsBox>
                            <DsTypography variant="bodyBoldSmall">
                              {d.title}
                            </DsTypography>
                            <DsTypography
                              variant="bodyRegularSmall"
                              color="text.secondary"
                              sx={{ display: "block", mt: 0.5 }}
                            >
                              {d.blurb}
                            </DsTypography>
                          </DsBox>
                        </DsStack>
                      );
                    })}
                  </DsStack>
                </DsCardContent>
              </DsCard>

              <DsCard variant="outlined" sx={{ borderColor: ACCENT_BORDER }}>
                <DsCardContent>
                  <DsTypography variant="bodyBoldSmall" sx={{ mb: 2 }}>
                    What unlocks next
                  </DsTypography>
                  <DsStack spacing={1.5}>
                    {NEXT_UP.map((n) => {
                      const Icon = n.icon;
                      return (
                        <DsStack
                          key={n.label}
                          direction="row"
                          spacing={1.25}
                          alignItems="center"
                        >
                          <Icon size={15} color={ACCENT} />
                          <DsTypography
                            variant="bodyRegularSmall"
                            color="text.secondary"
                          >
                            {n.label}
                          </DsTypography>
                        </DsStack>
                      );
                    })}
                  </DsStack>
                </DsCardContent>
              </DsCard>
            </DsStack>
          </DsBox>
        </DsBox>
      </DsBox>
    </DsBox>
  );
}
