import { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Share2,
  CalendarClock,
  Gauge,
  FileCheck2,
  Landmark,
  ReceiptText,
  Users,
  Wallet2,
  Star,
  MessageSquareText,
  MapPinned,
  Swords,
  LayoutGrid,
} from "lucide-react";
import {
  DsCard,
  DsCardContent,
  DsBox,
  DsStack,
  DsTypography,
  DsGrid,
  DsChip,
  PALETTE,
} from "@am92/react-design-system";
import { ScoreGauge, Stat } from "./Small.jsx";
import {
  getBusinessRiskProfileByGstin,
  buildBankFactorAssessment,
} from "../data/bankFactors.js";

const REVIEW_COLORS = {
  positivePct: PALETTE.successGreen,
  neutralPct: "#C9962C",
  negativePct: PALETTE.errorRed,
};

function ScoreBand({ score }) {
  const color =
    score >= 75
      ? PALETTE.successGreen
      : score >= 55
        ? "#C9962C"
        : score >= 35
          ? "#D97B29"
          : PALETTE.errorRed;
  return (
    <DsTypography variant="bodyBoldSmall" sx={{ color }}>
      {round(score)}/100
    </DsTypography>
  );
}

function round(n) {
  return Math.round(n * 10) / 10;
}

// Groups the 12 individual signals into digestible tabs instead of one long,
// cluttered grid — each group maps to one or more DetailCards below.
const GROUPS = [
  { id: "summary", label: "Summary", icon: LayoutGrid },
  { id: "credit", label: "Credit & Compliance", icon: Gauge },
  { id: "financials", label: "Financials", icon: Landmark },
  { id: "profile", label: "Business Profile", icon: Users },
  { id: "reputation", label: "Reputation & Digital", icon: Star },
];

// Maps each factor key (from bankFactors.js) to the tab it's detailed under,
// used to build the condensed per-group summary shown on the Summary tab.
const FACTOR_GROUPS = {
  credit: ["cibil", "itr", "gst"],
  financials: ["balanceSheet", "provisionalBalanceSheet", "bankAccounts"],
  profile: ["businessAge", "ownership", "location", "competition"],
  reputation: ["googleRating", "onlineReviews", "socialMedia"],
};

function ScoreBar({ score }) {
  const color =
    score >= 75
      ? PALETTE.successGreen
      : score >= 55
        ? "#C9962C"
        : score >= 35
          ? "#D97B29"
          : PALETTE.errorRed;
  return (
    <DsBox
      sx={{
        height: 6,
        borderRadius: 3,
        bgcolor: PALETTE.secondaryGrey10,
        overflow: "hidden",
      }}
    >
      <DsBox
        sx={{
          height: "100%",
          width: `${Math.max(score, 2)}%`,
          borderRadius: 3,
          bgcolor: color,
        }}
      />
    </DsBox>
  );
}

function OverviewGroupCard({ group, factors, onClick }) {
  const Icon = group.icon;
  const avg = round(factors.reduce((s, f) => s + f.score, 0) / factors.length);
  return (
    <DsCard
      variant="outlined"
      sx={{ height: "100%", cursor: "pointer" }}
      onClick={onClick}
    >
      <DsCardContent>
        <DsStack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1.5 }}
        >
          <DsStack direction="row" spacing={1} alignItems="center">
            <Icon size={16} color={PALETTE.primary} />
            <DsTypography variant="bodyBoldSmall">{group.label}</DsTypography>
          </DsStack>
          <ScoreBand score={avg} />
        </DsStack>
        <DsStack spacing={1.25}>
          {factors.map((f) => (
            <DsBox key={f.key}>
              <DsStack
                direction="row"
                justifyContent="space-between"
                sx={{ mb: 0.5 }}
              >
                <DsTypography
                  variant="supportRegularInfo"
                  color="text.secondary"
                >
                  {f.label}
                </DsTypography>
                <DsTypography
                  variant="supportRegularInfo"
                  sx={{ fontWeight: 600 }}
                >
                  {f.score}
                </DsTypography>
              </DsStack>
              <ScoreBar score={f.score} />
            </DsBox>
          ))}
        </DsStack>
      </DsCardContent>
    </DsCard>
  );
}

function GroupTabs({ active, onChange }) {
  return (
    <DsStack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
      {GROUPS.map((g) => {
        const Icon = g.icon;
        const selected = active === g.id;
        return (
          <DsBox
            key={g.id}
            onClick={() => onChange(g.id)}
            sx={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 2,
              py: 0.75,
              borderRadius: 5,
              border: "1px solid",
              borderColor: selected ? PALETTE.primary : "divider",
              bgcolor: selected
                ? "var(--ds-colour-actionPrimary)"
                : "transparent",
              color: selected ? "primary.contrastText" : "text.primary",
            }}
          >
            <Icon size={14} />
            <DsTypography variant="bodyBoldSmall" sx={{ color: "inherit" }}>
              {g.label}
            </DsTypography>
          </DsBox>
        );
      })}
    </DsStack>
  );
}

function DetailCard({ icon: Icon, title, subtitle, weight, score, children }) {
  return (
    <DsCard variant="outlined" sx={{ height: "100%" }}>
      <DsCardContent>
        <DsStack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 1.5 }}
        >
          <DsStack direction="row" spacing={1} alignItems="center">
            <Icon size={15} color={PALETTE.primary} />
            <DsBox>
              <DsTypography variant="bodyBoldSmall">{title}</DsTypography>
              {subtitle && (
                <DsTypography
                  variant="supportRegularMetadata"
                  color="text.secondary"
                >
                  {subtitle}
                </DsTypography>
              )}
            </DsBox>
          </DsStack>
          <DsBox sx={{ textAlign: "right", flexShrink: 0 }}>
            <ScoreBand score={score} />
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              weight {weight}%
            </DsTypography>
          </DsBox>
        </DsStack>
        {children}
      </DsCardContent>
    </DsCard>
  );
}

export function RiskFactorsCard({ gstin }) {
  const [activeGroup, setActiveGroup] = useState("summary");
  const profile = getBusinessRiskProfileByGstin(gstin);

  if (!profile) {
    return (
      <DsCard variant="outlined">
        <DsCardContent>
          <DsTypography variant="bodyRegularSmall" color="text.secondary">
            No bank risk profile found for this business.
          </DsTypography>
        </DsCardContent>
      </DsCard>
    );
  }

  const { FACTORS, overallScore, band } = buildBankFactorAssessment(profile);
  const radarData = FACTORS.map((f) => ({
    factor: f.label.replace(" ", "\n"),
    score: f.score,
  }));
  const byKey = Object.fromEntries(FACTORS.map((f) => [f.key, f]));

  const reviewData = [
    {
      name: "Positive",
      value: profile.onlineReviews.positivePct,
      key: "positivePct",
    },
    {
      name: "Neutral",
      value: profile.onlineReviews.neutralPct,
      key: "neutralPct",
    },
    {
      name: "Negative",
      value: profile.onlineReviews.negativePct,
      key: "negativePct",
    },
  ];

  const socialData = profile.socialMedia.platforms.map((p) => ({
    name: p.name,
    followers: p.followers,
  }));
  const bankAcctData = profile.bankAccounts.map((a) => ({
    name: a.bankName,
    balance: a.avgMonthlyBalanceLakhs,
    bounces: a.bounceCountLast12Months,
  }));
  const itrData = profile.itr.map((r) => ({
    fy: r.financialYear.slice(2),
    income: r.grossTotalIncomeLakhs,
  }));
  const bsData = [
    {
      name: "Assets",
      filed: profile.balanceSheet.totalAssetsLakhs,
      provisional: profile.provisionalBalanceSheet.totalAssetsLakhs,
    },
    {
      name: "Liabilities",
      filed: profile.balanceSheet.totalLiabilitiesLakhs,
      provisional: profile.provisionalBalanceSheet.totalLiabilitiesLakhs,
    },
    {
      name: "Net worth",
      filed: profile.balanceSheet.netWorthLakhs,
      provisional: profile.provisionalBalanceSheet.netWorthLakhs,
    },
  ];

  return (
    <DsStack spacing={2.5}>
      {/* Overall bank confidence score + radar */}
      <DsCard variant="outlined">
        <DsCardContent>
          <DsTypography variant="headingBoldExtraSmall" sx={{ mb: 0.5 }}>
            Bank Confidence Score
          </DsTypography>
          <DsTypography
            variant="supportRegularInfo"
            color="text.secondary"
            sx={{ mb: 2.5, display: "block" }}
          >
            Weighted across 13 signals a bank uses to gauge a business beyond
            its GST filings
          </DsTypography>

          <DsGrid container spacing={3}>
            <DsGrid size={{ xs: 12, md: 4 }}>
              <DsStack direction="row" spacing={2} alignItems="center">
                <ScoreGauge score={overallScore} />
                <DsBox>
                  <DsTypography variant="displayBoldSmall">
                    {overallScore}
                  </DsTypography>
                  <DsTypography
                    variant="bodyBoldSmall"
                    sx={{ color: PALETTE.successGreen }}
                  >
                    {band}
                  </DsTypography>
                </DsBox>
              </DsStack>

              <DsStack spacing={1} sx={{ mt: 2.5 }}>
                {FACTORS.slice()
                  .sort((a, b) => b.weight - a.weight)
                  .map((f) => (
                    <DsStack
                      key={f.key}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <DsTypography
                        variant="supportRegularInfo"
                        color="text.secondary"
                      >
                        {f.label}
                      </DsTypography>
                      <DsStack direction="row" spacing={1} alignItems="center">
                        <DsTypography
                          variant="supportRegularInfo"
                          sx={{ fontWeight: 600 }}
                        >
                          {f.score}
                        </DsTypography>
                        <DsTypography
                          variant="supportRegularMetadata"
                          color="text.secondary"
                        >
                          ({f.weight}%)
                        </DsTypography>
                      </DsStack>
                    </DsStack>
                  ))}
              </DsStack>
            </DsGrid>

            <DsGrid size={{ xs: 12, md: 8 }}>
              <DsBox sx={{ height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke={PALETTE.secondaryGrey20} />
                    <PolarAngleAxis
                      dataKey="factor"
                      tick={{ fill: PALETTE.secondaryGrey70, fontSize: 10 }}
                    />
                    <Radar
                      dataKey="score"
                      stroke={PALETTE.primary}
                      fill={PALETTE.primary}
                      fillOpacity={0.35}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </DsBox>
            </DsGrid>
          </DsGrid>
        </DsCardContent>
      </DsCard>

      {/* Detail grid, split into tabs so the 12 signals aren't all shown at once */}
      <GroupTabs active={activeGroup} onChange={setActiveGroup} />

      {activeGroup === "summary" && (
        <DsGrid container spacing={2.5}>
          {GROUPS.filter((g) => g.id !== "summary").map((g) => (
            <DsGrid key={g.id} size={{ xs: 12, sm: 6, lg: 3 }}>
              <OverviewGroupCard
                group={g}
                factors={FACTOR_GROUPS[g.id].map((k) => byKey[k])}
                onClick={() => setActiveGroup(g.id)}
              />
            </DsGrid>
          ))}
        </DsGrid>
      )}

      <DsGrid
        container
        spacing={2.5}
        sx={{ display: activeGroup === "summary" ? "none" : undefined }}
      >
        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "credit" ? undefined : "none" }}
        >
          <DetailCard
            icon={Gauge}
            title="CIBIL Score"
            subtitle={`Reported ${profile.cibil.reportDate}`}
            weight={byKey.cibil.weight}
            score={byKey.cibil.score}
          >
            <DsBox sx={{ height: 90 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={profile.cibil.history}
                  margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                >
                  <XAxis
                    dataKey="quarter"
                    tick={{ fill: PALETTE.secondaryGrey70, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis domain={[300, 900]} hide />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={PALETTE.primary}
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </DsBox>
            <DsStack
              direction="row"
              justifyContent="space-between"
              sx={{ mt: 1 }}
            >
              <Stat label="Score" value={profile.cibil.score} />
              <Stat
                label="Utilization"
                value={`${profile.cibil.creditUtilizationPct}%`}
              />
              <Stat
                label="Overdue a/c"
                value={profile.cibil.overdueAccounts}
                color={
                  profile.cibil.overdueAccounts > 0
                    ? PALETTE.errorRed
                    : PALETTE.successGreen
                }
              />
            </DsStack>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "credit" ? undefined : "none" }}
        >
          <DetailCard
            icon={ReceiptText}
            title="ITR Track Record"
            subtitle="Gross total income by financial year"
            weight={byKey.itr.weight}
            score={byKey.itr.score}
          >
            <DsBox sx={{ height: 90 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={itrData}
                  margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                >
                  <XAxis
                    dataKey="fy"
                    tick={{ fill: PALETTE.secondaryGrey70, fontSize: 9.5 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Bar
                    dataKey="income"
                    radius={[3, 3, 0, 0]}
                    fill={PALETTE.primary}
                  />
                </BarChart>
              </ResponsiveContainer>
            </DsBox>
            <DsStack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              {profile.itr.map((r) => (
                <DsChip
                  key={r.financialYear}
                  size="small"
                  label={`${r.financialYear} ${r.filedOnTime ? "on-time" : "late"}`}
                  variant="outlined"
                  sx={{
                    color: r.filedOnTime
                      ? PALETTE.successGreen
                      : PALETTE.errorRed,
                  }}
                />
              ))}
            </DsStack>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "financials" ? undefined : "none" }}
        >
          <DetailCard
            icon={FileCheck2}
            title="Balance Sheet vs Provisional"
            subtitle={`${profile.balanceSheet.financialYear} → ${profile.provisionalBalanceSheet.financialYear}`}
            weight={
              byKey.balanceSheet.weight + byKey.provisionalBalanceSheet.weight
            }
            score={
              (byKey.balanceSheet.score + byKey.provisionalBalanceSheet.score) /
              2
            }
          >
            <DsBox sx={{ height: 90 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bsData}
                  margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: PALETTE.secondaryGrey70, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip />
                  <Bar
                    dataKey="filed"
                    name="Filed"
                    radius={[3, 3, 0, 0]}
                    fill={PALETTE.secondaryGrey30}
                  />
                  <Bar
                    dataKey="provisional"
                    name="Provisional"
                    radius={[3, 3, 0, 0]}
                    fill={PALETTE.primary}
                  />
                </BarChart>
              </ResponsiveContainer>
            </DsBox>
            <DsStack
              direction="row"
              justifyContent="space-between"
              sx={{ mt: 1 }}
            >
              <Stat
                label="Net worth (filed)"
                value={`₹${profile.balanceSheet.netWorthLakhs}L`}
              />
              <Stat
                label="Net worth (provisional)"
                value={`₹${profile.provisionalBalanceSheet.netWorthLakhs}L`}
              />
            </DsStack>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "financials" ? undefined : "none" }}
        >
          <DetailCard
            icon={Landmark}
            title="Company Bank Account(s)"
            subtitle="Avg monthly balance, ₹ lakhs"
            weight={byKey.bankAccounts.weight}
            score={byKey.bankAccounts.score}
          >
            <DsBox sx={{ height: 90 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bankAcctData}
                  margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: PALETTE.secondaryGrey70, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Bar
                    dataKey="balance"
                    radius={[3, 3, 0, 0]}
                    fill={PALETTE.primary}
                  />
                </BarChart>
              </ResponsiveContainer>
            </DsBox>
            <DsStack
              direction="row"
              justifyContent="space-between"
              sx={{ mt: 1 }}
            >
              <Stat label="Accounts" value={profile.bankAccounts.length} />
              <Stat
                label="Bounces (12mo)"
                value={profile.bankAccounts.reduce(
                  (s, a) => s + a.bounceCountLast12Months,
                  0,
                )}
                color={
                  profile.bankAccounts.some(
                    (a) => a.bounceCountLast12Months > 0,
                  )
                    ? PALETTE.errorRed
                    : PALETTE.successGreen
                }
              />
            </DsStack>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "reputation" ? undefined : "none" }}
        >
          <DetailCard
            icon={Star}
            title="Google Rating"
            subtitle={`${profile.googleRating.totalReviews} reviews`}
            weight={byKey.googleRating.weight}
            score={byKey.googleRating.score}
          >
            <DsBox sx={{ height: 90 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={profile.googleRating.trend}
                  margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                >
                  <XAxis
                    dataKey="quarter"
                    tick={{ fill: PALETTE.secondaryGrey70, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis domain={[0, 5]} hide />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke={PALETTE.primary}
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </DsBox>
            <DsStack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1 }}
            >
              <Star size={14} color="#C9962C" fill="#C9962C" />
              <DsTypography variant="bodyBoldSmall">
                {profile.googleRating.rating} / 5
              </DsTypography>
            </DsStack>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "reputation" ? undefined : "none" }}
        >
          <DetailCard
            icon={MessageSquareText}
            title="Online Reviews"
            subtitle="Sentiment breakdown"
            weight={byKey.onlineReviews.weight}
            score={byKey.onlineReviews.score}
          >
            <DsStack direction="row" spacing={2} alignItems="center">
              <DsBox sx={{ width: 90, height: 90, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reviewData}
                      dataKey="value"
                      innerRadius={24}
                      outerRadius={40}
                      paddingAngle={2}
                    >
                      {reviewData.map((d) => (
                        <Cell key={d.key} fill={REVIEW_COLORS[d.key]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </DsBox>
              <DsStack spacing={0.5}>
                {reviewData.map((d) => (
                  <DsStack
                    key={d.key}
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                  >
                    <DsBox
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: 0.5,
                        bgcolor: REVIEW_COLORS[d.key],
                      }}
                    />
                    <DsTypography
                      variant="supportRegularMetadata"
                      color="text.secondary"
                    >
                      {d.name} {d.value}%
                    </DsTypography>
                  </DsStack>
                ))}
              </DsStack>
            </DsStack>
            <DsStack
              direction="row"
              spacing={0.75}
              flexWrap="wrap"
              sx={{ mt: 1.5 }}
            >
              {profile.onlineReviews.commonThemes.map((t) => (
                <DsChip key={t} size="small" label={t} variant="outlined" />
              ))}
            </DsStack>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "reputation" ? undefined : "none" }}
        >
          <DetailCard
            icon={Share2}
            title="Social Media Presence"
            subtitle={`${profile.socialMedia.postFrequencyPerMonth} posts/mo · ${profile.socialMedia.sentimentScorePct}% sentiment`}
            weight={byKey.socialMedia.weight}
            score={byKey.socialMedia.score}
          >
            <DsBox sx={{ height: 90 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={socialData}
                  margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: PALETTE.secondaryGrey70, fontSize: 9.5 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Bar
                    dataKey="followers"
                    radius={[3, 3, 0, 0]}
                    fill={PALETTE.primary}
                  />
                </BarChart>
              </ResponsiveContainer>
            </DsBox>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "profile" ? undefined : "none" }}
        >
          <DetailCard
            icon={CalendarClock}
            title="Business Age"
            subtitle={`Registered ${profile.businessAge.registeredSince}`}
            weight={byKey.businessAge.weight}
            score={byKey.businessAge.score}
          >
            <DsTypography
              variant="displayBoldSmall"
              sx={{ color: "primary.main" }}
            >
              {round(profile.businessAge.yearsInOperation)} yrs
            </DsTypography>
            <DsTypography
              variant="supportRegularMetadata"
              color="text.secondary"
            >
              in continuous operation
            </DsTypography>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "profile" ? undefined : "none" }}
        >
          <DetailCard
            icon={Users}
            title="Ownership"
            subtitle={`Stable for ${round(profile.ownership.ownershipStabilityYears)} yrs`}
            weight={byKey.ownership.weight}
            score={byKey.ownership.score}
          >
            <DsStack spacing={0.75}>
              {profile.ownership.owners.map((o) => (
                <DsStack
                  key={o.name}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <DsTypography variant="supportRegularInfo">
                    {o.name} {o.panVerified ? "" : "(PAN unverified)"}
                  </DsTypography>
                  <DsTypography
                    variant="supportRegularInfo"
                    color="text.secondary"
                  >
                    {o.sharePct}%
                  </DsTypography>
                </DsStack>
              ))}
            </DsStack>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "credit" ? undefined : "none" }}
        >
          <DetailCard
            icon={Wallet2}
            title="GST Standing"
            subtitle={profile.gstProfile.registrationStatus}
            weight={byKey.gst.weight}
            score={byKey.gst.score}
          >
            <DsStack direction="row" justifyContent="space-between">
              <Stat
                label="Filing consistency"
                value={`${profile.gstProfile.returnFilingConsistencyPct}%`}
              />
              <Stat
                label="Cancellation history"
                value={profile.gstProfile.cancellationHistory ? "Yes" : "None"}
                color={
                  profile.gstProfile.cancellationHistory
                    ? PALETTE.errorRed
                    : PALETTE.successGreen
                }
              />
            </DsStack>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "profile" ? undefined : "none" }}
        >
          <DetailCard
            icon={MapPinned}
            title="Location"
            subtitle={profile.location.areaType}
            weight={byKey.location.weight}
            score={byKey.location.score}
          >
            <DsStack spacing={0.5}>
              <DsTypography variant="supportRegularInfo" color="text.secondary">
                {profile.location.address}
              </DsTypography>
              <DsStack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                sx={{ mt: 0.5 }}
              >
                <DsChip
                  size="small"
                  label={`Foot traffic: ${profile.location.footTraffic}`}
                  variant="outlined"
                />
                <DsChip
                  size="small"
                  label={profile.location.ownedOrLeased}
                  variant="outlined"
                />
                <DsChip
                  size="small"
                  label={`${profile.location.proximityToTransportKm}km to transport`}
                  variant="outlined"
                />
              </DsStack>
            </DsStack>
          </DetailCard>
        </DsGrid>

        <DsGrid
          size={{ xs: 12, sm: 6, lg: 4 }}
          sx={{ display: activeGroup === "profile" ? undefined : "none" }}
        >
          <DetailCard
            icon={Swords}
            title="Competition"
            subtitle={`${profile.competition.competitorCountNearby} nearby competitors`}
            weight={byKey.competition.weight}
            score={byKey.competition.score}
          >
            <DsStack direction="row" justifyContent="space-between">
              <Stat
                label="Est. market share"
                value={`${profile.competition.estimatedMarketSharePct}%`}
              />
              <Stat
                label="Intensity"
                value={profile.competition.competitiveIntensity}
                color={
                  profile.competition.competitiveIntensity === "High"
                    ? PALETTE.errorRed
                    : profile.competition.competitiveIntensity === "Moderate"
                      ? "#C9962C"
                      : PALETTE.successGreen
                }
              />
            </DsStack>
          </DetailCard>
        </DsGrid>
      </DsGrid>
    </DsStack>
  );
}
