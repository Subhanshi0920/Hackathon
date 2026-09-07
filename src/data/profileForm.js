// ---------------------------------------------------------------------------
// profileForm.js — the "Business profile" form: the risk factors a person can
// just type in (CIBIL score, GST standing, ownership, location, reputation).
// The document-backed factors — ITR, balance sheet, provisional B/S, bank
// conduct — stay as file uploads (see RiskDocsCard / riskUploadParsers.js).
//
// `formToSections()` turns the flat form values into risk-profile section
// overrides DataContext merges over the demo profile (see getRiskProfile).
// Only non-empty fields are emitted, and each section is shallow-merged over
// the demo one — so a half-filled form still scores.
// ---------------------------------------------------------------------------

const FOOT_TRAFFIC = ["High", "Medium", "Low"];
const TENURE = ["Owned", "Leased"];
const GST_STATUS = ["Active", "Suspended", "Cancelled"];

// Grouped to match the Risk Factors tab. `section`/`key` say where a value
// lands in the risk profile; list-shaped sections are assembled in
// SECTION_FINALIZERS below.
export const FIELD_GROUPS = [
  {
    id: "credit",
    label: "Credit & Compliance",
    fields: [
      {
        name: "cibilScore",
        label: "CIBIL score",
        section: "cibil",
        key: "score",
        type: "number",
      },
      {
        name: "cibilUtil",
        label: "Credit utilisation",
        section: "cibil",
        key: "creditUtilizationPct",
        type: "number",
        suffix: "%",
      },
      {
        name: "cibilEnq",
        label: "Enquiries (last 6 mo)",
        section: "cibil",
        key: "enquiriesLast6Months",
        type: "number",
      },
      {
        name: "cibilOverdue",
        label: "Overdue accounts",
        section: "cibil",
        key: "overdueAccounts",
        type: "number",
      },
      {
        name: "gstStatus",
        label: "GST registration",
        section: "gstProfile",
        key: "registrationStatus",
        type: "select",
        options: GST_STATUS,
      },
      {
        name: "gstFiling",
        label: "Return filing consistency",
        section: "gstProfile",
        key: "returnFilingConsistencyPct",
        type: "number",
        suffix: "%",
      },
      {
        name: "gstCancelled",
        label: "Has a cancellation history",
        section: "gstProfile",
        key: "cancellationHistory",
        type: "switch",
      },
    ],
  },
  {
    id: "profile",
    label: "Business Profile",
    fields: [
      {
        name: "yearsInOp",
        label: "Years in operation",
        section: "businessAge",
        key: "yearsInOperation",
        type: "number",
      },
      {
        name: "owners",
        label: "Number of owners",
        section: "ownership",
        key: "numberOfOwners",
        type: "number",
      },
      {
        name: "ownerStability",
        label: "Ownership stable for",
        section: "ownership",
        key: "ownershipStabilityYears",
        type: "number",
        suffix: "yrs",
      },
      {
        name: "ownerPanPct",
        label: "Owners with PAN verified",
        section: "ownership",
        key: "__panPct",
        type: "number",
        suffix: "%",
      },
      {
        name: "address",
        label: "Registered address",
        section: "location",
        key: "address",
        type: "text",
        wide: true,
      },
      {
        name: "footTraffic",
        label: "Foot traffic",
        section: "location",
        key: "footTraffic",
        type: "select",
        options: FOOT_TRAFFIC,
      },
      {
        name: "transportKm",
        label: "Distance to transport",
        section: "location",
        key: "proximityToTransportKm",
        type: "number",
        suffix: "km",
      },
      {
        name: "tenure",
        label: "Premises",
        section: "location",
        key: "ownedOrLeased",
        type: "select",
        options: TENURE,
      },
      {
        name: "competitors",
        label: "Competitors nearby",
        section: "competition",
        key: "competitorCountNearby",
        type: "number",
      },
      {
        name: "marketShare",
        label: "Estimated market share",
        section: "competition",
        key: "estimatedMarketSharePct",
        type: "number",
        suffix: "%",
      },
    ],
  },
  {
    id: "reputation",
    label: "Reputation & Digital",
    fields: [
      {
        name: "googleRating",
        label: "Google rating",
        section: "googleRating",
        key: "rating",
        type: "number",
      },
      {
        name: "googleReviews",
        label: "Google review count",
        section: "googleRating",
        key: "totalReviews",
        type: "number",
      },
      {
        name: "followers",
        label: "Total social followers",
        section: "socialMedia",
        key: "__followers",
        type: "number",
      },
      {
        name: "engagement",
        label: "Avg engagement rate",
        section: "socialMedia",
        key: "__engagement",
        type: "number",
        suffix: "%",
      },
      {
        name: "postFreq",
        label: "Posts per month",
        section: "socialMedia",
        key: "postFrequencyPerMonth",
        type: "number",
      },
      {
        name: "sentiment",
        label: "Social sentiment score",
        section: "socialMedia",
        key: "sentimentScorePct",
        type: "number",
        suffix: "%",
      },
      {
        name: "socialVerified",
        label: "Social profiles verified",
        section: "socialMedia",
        key: "__verified",
        type: "switch",
      },
    ],
  },
];

export const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);

const isBlank = (v) => v === "" || v === null || v === undefined;

// Sections whose scorer expects a list / nested shape — assembled from the
// intermediate `__`-prefixed keys the generic builder collected.
const SECTION_FINALIZERS = {
  ownership: (raw, demo) => {
    const merged = { ...demo, ...raw };
    const count = Math.max(1, Math.round(merged.numberOfOwners ?? 1));
    const verifiedPct = merged.__panPct ?? 100;
    const verifiedCount = Math.round((count * verifiedPct) / 100);
    delete merged.__panPct;
    return {
      ...merged,
      numberOfOwners: count,
      owners: Array.from({ length: count }, (_, i) => ({
        name: `Owner ${i + 1}`,
        panVerified: i < verifiedCount,
      })),
    };
  },
  socialMedia: (raw, demo) => {
    const merged = { ...demo, ...raw };
    const followers = merged.__followers;
    const engagement = merged.__engagement;
    const verified = merged.__verified;
    delete merged.__followers;
    delete merged.__engagement;
    delete merged.__verified;
    if (followers == null && engagement == null && verified == null)
      return merged;
    return {
      ...merged,
      platforms: [
        {
          name: "All platforms",
          followers: followers ?? 0,
          engagementRatePct: engagement ?? 0,
          verified: verified ?? false,
        },
      ],
    };
  },
};

/**
 * Flat form values -> { [profileSection]: overrideValue }, ready to merge
 * over the demo profile. `demoProfile` supplies fallbacks for list sections.
 */
export function formToSections(values, demoProfile = {}) {
  // A section is "active" only if the user filled at least one non-switch
  // field in it — a switch alone (which always has a default) never creates
  // a section on its own.
  const activeSections = new Set(
    ALL_FIELDS.filter(
      (f) => f.type !== "switch" && !isBlank(values[f.name]),
    ).map((f) => f.section),
  );
  if (activeSections.size === 0) return {};

  const collected = {}; // section -> { key: value }
  for (const f of ALL_FIELDS) {
    if (!activeSections.has(f.section)) continue;
    const v = values[f.name];
    if (f.type === "switch") {
      collected[f.section] ??= {};
      collected[f.section][f.key] = v === true;
      continue;
    }
    if (isBlank(v)) continue;
    collected[f.section] ??= {};
    collected[f.section][f.key] = f.type === "number" ? Number(v) : v;
  }

  const sections = {};
  for (const [section, raw] of Object.entries(collected)) {
    const finalizer = SECTION_FINALIZERS[section];
    sections[section] = finalizer ? finalizer(raw, demoProfile[section]) : raw; // shallow-merged over demo in getRiskProfile
  }
  return sections;
}

export const EMPTY_FORM = Object.fromEntries(
  ALL_FIELDS.map((f) => [
    f.name,
    f.type === "switch" ? Boolean(f.default) : "",
  ]),
);

/**
 * The current demo value for a field, shown as the input's placeholder so the
 * user knows what stays in effect if they leave it blank.
 */
export function fieldPlaceholder(field, demo) {
  if (!demo) return "";
  const platforms = demo.socialMedia?.platforms ?? [];
  const owners = demo.ownership?.owners ?? [];

  switch (field.key) {
    case "__panPct":
      return owners.length
        ? String(
            Math.round(
              (owners.filter((o) => o.panVerified).length / owners.length) *
                100,
            ),
          )
        : "";
    case "__followers":
      return platforms.length
        ? String(platforms.reduce((sum, p) => sum + (p.followers || 0), 0))
        : "";
    case "__engagement":
      return platforms.length
        ? (
            platforms.reduce((sum, p) => sum + (p.engagementRatePct || 0), 0) /
            platforms.length
          ).toFixed(1)
        : "";
    default: {
      const v = (demo[field.section] ?? {})[field.key];
      return v == null ? "" : String(v);
    }
  }
}
