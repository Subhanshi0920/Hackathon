import { Mail, Phone, MapPin, Briefcase } from "lucide-react";
import {
  DsCard,
  DsCardContent,
  DsBox,
  DsStack,
  DsTypography,
  DsGrid,
  DsAvatar,
  DsChip,
  DsDivider,
  PALETTE,
} from "@am92/react-design-system";
import { DataUploadCard } from "./DataUploadCard.jsx";

function initialsOf(name) {
  if (!name) return "?";
  const words = name
    .replace(/(Pvt\.?|Private|Ltd\.?|Limited)/gi, "")
    .trim()
    .split(/\s+/);
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <DsBox>
      <DsTypography
        variant="supportRegularMetadata"
        color="text.secondary"
        sx={{ display: "block", mb: 0.25 }}
      >
        {label}
      </DsTypography>
      <DsTypography variant="bodyBoldSmall">{value}</DsTypography>
    </DsBox>
  );
}

/**
 * "Business" tab content: the selected business's full profile (from
 * businessProfile.json, looked up by GSTIN) plus the GSTR-1/GSTR-3B/bank
 * upload card. Note the uploaded GST/bank data is shared app-wide for now —
 * it isn't yet scoped per selected business (the business switcher in the
 * header is a separate, not-yet-fully-wired concern).
 */
export function BusinessSection({ profile }) {
  if (!profile) {
    return (
      <DsCard variant="outlined">
        <DsCardContent>
          <DsTypography variant="bodyRegularSmall" color="text.secondary">
            No profile found for this business.
          </DsTypography>
        </DsCardContent>
      </DsCard>
    );
  }

  return (
    <DsStack spacing={2.5}>
      <DsCard variant="outlined">
        <DsCardContent>
          {/* Identity header */}
          <DsStack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ mb: 2.5 }}
          >
            <DsAvatar
              ds-size="L"
              ds-variant="text"
              sx={{ bgcolor: "primary.main" }}
            >
              {initialsOf(profile.legalName)}
            </DsAvatar>
            <DsBox sx={{ flex: 1, minWidth: 0 }}>
              <DsTypography variant="headingBoldSmall" sx={{ mb: 0.5 }}>
                {profile.legalName}
              </DsTypography>
              <DsStack direction="row" spacing={1} flexWrap="wrap">
                <DsChip label={`GSTIN ${profile.gstin}`} size="small" />
                {profile.constitution && (
                  <DsChip
                    label={profile.constitution}
                    size="small"
                    variant="outlined"
                  />
                )}
              </DsStack>
            </DsBox>
          </DsStack>

          <DsDivider sx={{ mb: 2.5 }} />

          {/* Registration details */}
          <DsGrid container spacing={2.5} sx={{ mb: 2.5 }}>
            <DsGrid size={{ xs: 6, sm: 3 }}>
              <Field label="PAN" value={profile.pan} />
            </DsGrid>
            <DsGrid size={{ xs: 6, sm: 3 }}>
              <Field label="Registered Since" value={profile.registeredSince} />
            </DsGrid>
            <DsGrid size={{ xs: 6, sm: 3 }}>
              <Field label="Filing Frequency" value={profile.filingFrequency} />
            </DsGrid>
            <DsGrid size={{ xs: 6, sm: 3 }}>
              <Field
                label="Authorized Signatory"
                value={profile.authorizedSignatory}
              />
            </DsGrid>
          </DsGrid>

          <DsDivider sx={{ mb: 2.5 }} />

          {/* Business & location */}
          <DsStack spacing={1.5} sx={{ mb: 2.5 }}>
            <DsStack direction="row" spacing={1.25} alignItems="flex-start">
              <Briefcase
                size={15}
                color={PALETTE.secondaryGrey70}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <DsBox>
                <DsTypography
                  variant="supportRegularMetadata"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  Nature of Business
                </DsTypography>
                <DsTypography variant="bodyRegularSmall">
                  {profile.natureOfBusiness}
                </DsTypography>
              </DsBox>
            </DsStack>

            <DsStack direction="row" spacing={1.25} alignItems="flex-start">
              <MapPin
                size={15}
                color={PALETTE.secondaryGrey70}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <DsBox>
                <DsTypography
                  variant="supportRegularMetadata"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  Registered Address
                </DsTypography>
                <DsTypography variant="bodyRegularSmall">
                  {profile.principalPlaceOfBusiness}
                </DsTypography>
              </DsBox>
            </DsStack>
          </DsStack>

          <DsDivider sx={{ mb: 2 }} />

          {/* Contact */}
          <DsStack direction="row" spacing={4} flexWrap="wrap">
            {profile.contactEmail && (
              <DsStack direction="row" spacing={0.75} alignItems="center">
                <Mail size={13} color={PALETTE.secondaryGrey70} />
                <DsTypography
                  variant="supportRegularMetadata"
                  color="text.secondary"
                >
                  {profile.contactEmail}
                </DsTypography>
              </DsStack>
            )}
            {profile.contactPhone && (
              <DsStack direction="row" spacing={0.75} alignItems="center">
                <Phone size={13} color={PALETTE.secondaryGrey70} />
                <DsTypography
                  variant="supportRegularMetadata"
                  color="text.secondary"
                >
                  {profile.contactPhone}
                </DsTypography>
              </DsStack>
            )}
          </DsStack>
        </DsCardContent>
      </DsCard>

      {/* <DataUploadCard /> */}
    </DsStack>
  );
}
