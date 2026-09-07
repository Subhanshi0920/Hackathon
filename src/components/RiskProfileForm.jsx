import { UserRoundPen, RotateCcw } from "lucide-react";
import {
  DsCard,
  DsCardContent,
  DsBox,
  DsStack,
  DsTypography,
  DsButton,
  DsTextField,
  DsSelect,
  DsSwitch,
  DsChip,
  DsDivider,
  PALETTE,
} from "@am92/react-design-system";
import { useAppData } from "../data/DataContext.jsx";
import { FIELD_GROUPS, fieldPlaceholder } from "../data/profileForm.js";

function Field({ field, value, placeholder, onChange }) {
  if (field.type === "switch") {
    return (
      <DsStack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ gridColumn: field.wide ? "1 / -1" : "auto" }}
      >
        <DsTypography variant="bodyRegularSmall">{field.label}</DsTypography>
        <DsSwitch
          name={field.name}
          value={value ? "yes" : "no"}
          positiveLabel="Yes"
          positiveValue="yes"
          negativeLabel="No"
          negativeValue="no"
          onChange={(_name, v) => onChange(v === "yes")}
        />
      </DsStack>
    );
  }

  if (field.type === "select") {
    return (
      <DsBox sx={{ gridColumn: field.wide ? "1 / -1" : "auto" }}>
        <DsTypography
          variant="supportRegularMetadata"
          color="text.secondary"
          sx={{ display: "block", mb: 0.5 }}
        >
          {field.label}
        </DsTypography>
        <DsSelect
          size="small"
          fullWidth
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          options={[
            {
              label: placeholder ? `${placeholder} (current)` : "Not set",
              value: "",
            },
            ...field.options.map((o) => ({ label: o, value: o })),
          ]}
        />
      </DsBox>
    );
  }

  return (
    <DsTextField
      size="small"
      fullWidth
      type={field.type === "number" ? "number" : "text"}
      label={field.suffix ? `${field.label} (${field.suffix})` : field.label}
      placeholder={placeholder ? String(placeholder) : "Optional"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      sx={{ gridColumn: field.wide ? "1 / -1" : "auto" }}
    />
  );
}

/**
 * "Business profile" form — a few typed inputs that override the demo risk
 * profile section by section (see profileForm.js / DataContext.getRiskProfile).
 * Blank fields keep the demo value, so a partly-filled form still scores.
 */
export function RiskProfileForm() {
  const { profileForm, updateProfileForm, resetProfileForm, demoRiskProfile } =
    useAppData();

  const filledCount = Object.entries(profileForm).filter(
    ([, v]) => v !== "" && v !== false,
  ).length;

  return (
    <DsCard variant="outlined">
      <DsCardContent>
        <DsStack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 0.5 }}
        >
          <DsStack direction="row" spacing={1} alignItems="center">
            <UserRoundPen size={16} color={PALETTE.primary} />
            <DsTypography variant="headingBoldExtraSmall">
              Business profile
            </DsTypography>
            <DsChip label="Optional" size="small" />
          </DsStack>
          {filledCount > 0 && (
            <DsButton
              size="small"
              variant="text"
              color="secondary"
              startIcon={<RotateCcw size={13} />}
              onClick={resetProfileForm}
            >
              Reset
            </DsButton>
          )}
        </DsStack>
        <DsTypography
          variant="supportRegularMetadata"
          color="text.secondary"
          sx={{ display: "block", mb: 2 }}
        >
          Fill what you know — anything left blank uses the demo value. Updates
          the Risk Factors tab live.
        </DsTypography>

        <DsStack spacing={3}>
          {FIELD_GROUPS.map((group) => (
            <DsBox key={group.id}>
              <DsTypography variant="bodyBoldSmall" sx={{ mb: 1.5 }}>
                {group.label}
              </DsTypography>
              <DsBox
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  alignItems: "center",
                }}
              >
                {group.fields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={profileForm[field.name]}
                    placeholder={fieldPlaceholder(field, demoRiskProfile)}
                    onChange={(v) => updateProfileForm({ [field.name]: v })}
                  />
                ))}
              </DsBox>
              {group.id !== "reputation" && <DsDivider sx={{ mt: 3 }} />}
            </DsBox>
          ))}
        </DsStack>
      </DsCardContent>
    </DsCard>
  );
}
