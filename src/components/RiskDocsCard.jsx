import { useRef, useState } from "react";
import { FileText, Download, RotateCcw, AlertCircle } from "lucide-react";
import {
  DsCard,
  DsCardContent,
  DsBox,
  DsStack,
  DsTypography,
  DsButton,
  DsIconButton,
  DsChip,
  DsDivider,
  DsTooltip,
  PALETTE,
} from "@am92/react-design-system";
import { useAppData } from "../data/DataContext.jsx";
import {
  RISK_FACTORS,
  parseRiskFactorFile,
  downloadRiskTemplate,
} from "../data/riskUploadParsers.js";
import { UploadValidationError } from "../data/uploadParsers.js";

const FACTOR_KEYS = Object.keys(RISK_FACTORS);

function RiskRow({ factorKey }) {
  const spec = RISK_FACTORS[factorKey];
  const { riskDocStatus, applyRiskDoc, clearRiskDoc } = useAppData();
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const fileName = riskDocStatus[factorKey];
  const uploaded = Boolean(fileName);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const value = await parseRiskFactorFile(factorKey, file);
      applyRiskDoc(factorKey, value, file.name);
    } catch (err) {
      setError(
        err instanceof UploadValidationError
          ? err.message
          : "Couldn't read that file. Check the format and try again.",
      );
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <DsStack
      direction="row"
      spacing={1.5}
      alignItems="flex-start"
      sx={{ py: 1.25 }}
    >
      <DsBox
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: 1,
          bgcolor: PALETTE.secondaryGrey10,
          flexShrink: 0,
          mt: 0.25,
        }}
      >
        <FileText size={15} color={PALETTE.primary} />
      </DsBox>

      <DsBox sx={{ flex: 1, minWidth: 0 }}>
        <DsStack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
        >
          <DsTypography variant="bodyBoldSmall">{spec.label}</DsTypography>
          <DsStack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ flexShrink: 0 }}
          >
            <DsTooltip title="Download template">
              <DsIconButton
                size="small"
                onClick={() => downloadRiskTemplate(factorKey)}
              >
                <Download size={14} />
              </DsIconButton>
            </DsTooltip>
            {uploaded && (
              <DsTooltip title="Reset to demo data">
                <DsIconButton
                  size="small"
                  onClick={() => clearRiskDoc(factorKey)}
                >
                  <RotateCcw size={14} />
                </DsIconButton>
              </DsTooltip>
            )}
            <DsButton
              size="small"
              variant="outlined"
              color="primary"
              loading={busy}
              onClick={() => inputRef.current?.click()}
            >
              {uploaded ? "Replace" : "Upload"}
            </DsButton>
          </DsStack>
        </DsStack>

        {uploaded && (
          <DsTypography
            variant="supportRegularMetadata"
            color="text.secondary"
            sx={{ display: "block", mt: 0.25 }}
          >
            {fileName}
          </DsTypography>
        )}

        {error && (
          <DsStack
            direction="row"
            spacing={0.5}
            alignItems="flex-start"
            sx={{ mt: 0.5 }}
          >
            <AlertCircle
              size={12}
              color={PALETTE.errorRed}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <DsTypography variant="supportRegularMetadata" color="error.main">
              {error}
            </DsTypography>
          </DsStack>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </DsBox>
    </DsStack>
  );
}

/**
 * File upload for the document-backed risk factors (ITR, balance sheet,
 * provisional B/S, bank conduct). Everything else is typed into the
 * Business profile form.
 */
export function RiskDocsCard() {
  return (
    <DsCard variant="outlined">
      <DsCardContent>
        <DsStack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 0.5 }}
        >
          <FileText size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">
            Financial documents
          </DsTypography>
          <DsChip label="Optional" size="small" />
        </DsStack>
        <DsTypography
          variant="supportRegularMetadata"
          color="text.secondary"
          sx={{ display: "block", mb: 1.5 }}
        >
          These come from filings — upload the statement rather than retyping
          it.
        </DsTypography>

        <DsStack divider={<DsDivider />}>
          {FACTOR_KEYS.map((key) => (
            <RiskRow key={key} factorKey={key} />
          ))}
        </DsStack>
      </DsCardContent>
    </DsCard>
  );
}
