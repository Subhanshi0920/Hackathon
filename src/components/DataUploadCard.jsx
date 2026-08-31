import { useRef, useState } from "react";
import { Upload, FileText, Users, Landmark, CheckCircle2, AlertCircle, RotateCcw, Download, Clock, X } from "lucide-react";
import { DsCard, DsCardContent, DsBox, DsStack, DsTypography, DsButton, DsIconButton, DsChip, DsDivider, DsTooltip, PALETTE } from "@am92/react-design-system";
import { useAppData } from "../data/DataContext.jsx";
import {
  parseGstr1File,
  parseGstFile,
  parseBankFile,
  downloadGstr1Template,
  downloadGstTemplate,
  downloadBankTemplate,
  UploadValidationError,
} from "../data/uploadParsers.js";

/**
 * One upload row. Selecting/parsing a file here does NOT touch calculations —
 * it only stages a pending change (held in DataUploadCard's state). Nothing
 * recalculates until the card's single Submit button is clicked.
 */
function UploadSlot({ icon, title, accept, activeSource, pending, parseFile, onStage, onStageReset, onDiscardPending, onTemplate }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const doc = await parseFile(file);
      onStage(doc, file.name);
    } catch (err) {
      setError(err instanceof UploadValidationError ? err.message : "Couldn't read that file. Please check the format and try again.");
    } finally {
      setBusy(false);
      e.target.value = ""; // allow re-uploading the same filename
    }
  }

  const canReset = (activeSource.kind === "uploaded" || pending?.kind === "upload") && pending?.kind !== "reset";

  return (
    <DsStack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1.25 }}>
      <DsBox sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 1, bgcolor: PALETTE.secondaryGrey10, flexShrink: 0, mt: 0.25 }}>
        {icon}
      </DsBox>

      <DsBox sx={{ flex: 1, minWidth: 0 }}>
        <DsStack direction="row" justifyContent="space-between" alignItems="center">
          <DsTypography variant="bodyBoldSmall">{title}</DsTypography>
          <DsChip
            label={activeSource.kind === "uploaded" ? "Uploaded" : "Demo"}
            color={activeSource.kind === "uploaded" ? "success" : "default"}
            size="small"
          />
        </DsStack>

        {activeSource.kind === "uploaded" && !pending && (
          <DsTypography variant="supportRegularMetadata" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {activeSource.fileName}
          </DsTypography>
        )}

        {pending && (
          <DsStack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.5 }}>
            <Clock size={12} color={PALETTE.warningOrange} style={{ flexShrink: 0 }} />
            <DsTypography variant="supportRegularMetadata" sx={{ color: PALETTE.warningOrange, flex: 1 }}>
              {pending.kind === "reset" ? "Reset to demo data" : pending.fileName} — not yet applied
            </DsTypography>
            <DsBox onClick={onDiscardPending} sx={{ cursor: "pointer", display: "flex" }}>
              <X size={12} color={PALETTE.secondaryGrey70} />
            </DsBox>
          </DsStack>
        )}

        {error && (
          <DsStack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mt: 0.5 }}>
            <AlertCircle size={12} color={PALETTE.errorRed} style={{ flexShrink: 0, marginTop: 1 }} />
            <DsTypography variant="supportRegularMetadata" color="error.main">{error}</DsTypography>
          </DsStack>
        )}

        <input ref={inputRef} type="file" accept={accept} onChange={handleChange} style={{ display: "none" }} />

        <DsStack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
          <DsButton size="small" variant="outlined" color="primary" loading={busy} onClick={() => inputRef.current?.click()}>
            {activeSource.kind === "uploaded" || pending ? "Replace" : "Upload"}
          </DsButton>
          <DsTooltip title="Download template">
            <DsIconButton size="small" onClick={onTemplate}>
              <Download size={14} />
            </DsIconButton>
          </DsTooltip>
          {canReset && (
            <DsTooltip title="Reset to demo data">
              <DsIconButton size="small" onClick={onStageReset}>
                <RotateCcw size={14} />
              </DsIconButton>
            </DsTooltip>
          )}
        </DsStack>
      </DsBox>
    </DsStack>
  );
}

const EMPTY_PENDING = { gstr1: null, gst3b: null, bank: null };

export function DataUploadCard() {
  const {
    gstr1Source,
    gstSource,
    bankSource,
    setGstr1Document,
    setGstDocument,
    setBankDocument,
    resetGstr1Document,
    resetGstDocument,
    resetBankDocument,
  } = useAppData();

  const [pending, setPending] = useState(EMPTY_PENDING);
  const [justApplied, setJustApplied] = useState(false);

  const pendingCount = Object.values(pending).filter(Boolean).length;

  function stage(key, value) {
    setJustApplied(false);
    setPending((p) => ({ ...p, [key]: value }));
  }

  function discard(key) {
    setPending((p) => ({ ...p, [key]: null }));
  }

  function handleSubmit() {
    if (pending.gstr1) {
      if (pending.gstr1.kind === "reset") {
        resetGstr1Document();
      } else {
        setGstr1Document(pending.gstr1.doc, pending.gstr1.fileName);
      }
    }
    if (pending.gst3b) {
      if (pending.gst3b.kind === "reset") {
        resetGstDocument();
      } else {
        setGstDocument(pending.gst3b.doc, pending.gst3b.fileName);
      }
    }
    if (pending.bank) {
      if (pending.bank.kind === "reset") {
        resetBankDocument();
      } else {
        setBankDocument(pending.bank.doc, pending.bank.fileName);
      }
    }
    setPending(EMPTY_PENDING);
    setJustApplied(true);
  }

  function handleDiscardAll() {
    setPending(EMPTY_PENDING);
    setJustApplied(false);
  }

  return (
    <DsCard variant="outlined">
      <DsCardContent>
        <DsStack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Upload size={16} color={PALETTE.primary} />
          <DsTypography variant="headingBoldExtraSmall">Upload Data</DsTypography>
        </DsStack>

        <DsStack divider={<DsDivider />}>
          <UploadSlot
            icon={<Users size={15} color={PALETTE.primary} />}
            title="GSTR-1 (Buyer Data)"
            accept=".csv,.xlsx,.xls"
            activeSource={gstr1Source}
            pending={pending.gstr1}
            parseFile={parseGstr1File}
            onStage={(doc, fileName) => stage("gstr1", { kind: "upload", doc, fileName })}
            onStageReset={() => stage("gstr1", { kind: "reset" })}
            onDiscardPending={() => discard("gstr1")}
            onTemplate={downloadGstr1Template}
          />
          <UploadSlot
            icon={<FileText size={15} color={PALETTE.primary} />}
            title="GSTR-3B (Filing Data)"
            accept=".csv,.xlsx,.xls"
            activeSource={gstSource}
            pending={pending.gst3b}
            parseFile={parseGstFile}
            onStage={(doc, fileName) => stage("gst3b", { kind: "upload", doc, fileName })}
            onStageReset={() => stage("gst3b", { kind: "reset" })}
            onDiscardPending={() => discard("gst3b")}
            onTemplate={downloadGstTemplate}
          />
          <UploadSlot
            icon={<Landmark size={15} color={PALETTE.primary} />}
            title="Bank Statement"
            accept=".csv,.xlsx,.xls"
            activeSource={bankSource}
            pending={pending.bank}
            parseFile={parseBankFile}
            onStage={(doc, fileName) => stage("bank", { kind: "upload", doc, fileName })}
            onStageReset={() => stage("bank", { kind: "reset" })}
            onDiscardPending={() => discard("bank")}
            onTemplate={downloadBankTemplate}
          />
        </DsStack>

        <DsDivider sx={{ my: 2 }} />

        <DsStack direction="row" spacing={1.5} alignItems="center">
          <DsButton variant="contained" color="primary" disabled={pendingCount === 0} onClick={handleSubmit}>
            {pendingCount === 0 ? "Submit" : `Submit ${pendingCount} change${pendingCount > 1 ? "s" : ""}`}
          </DsButton>
          {pendingCount > 0 && (
            <DsButton variant="text" color="secondary" onClick={handleDiscardAll}>
              Discard
            </DsButton>
          )}
          {justApplied && pendingCount === 0 && (
            <DsStack direction="row" spacing={0.6} alignItems="center">
              <CheckCircle2 size={13} color={PALETTE.successGreen} />
              <DsTypography variant="supportRegularMetadata" sx={{ color: "success.main" }}>
                Applied
              </DsTypography>
            </DsStack>
          )}
        </DsStack>
      </DsCardContent>
    </DsCard>
  );
}