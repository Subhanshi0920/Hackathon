import { DsBox, DsTypography } from "@am92/react-design-system";
import { PALETTE } from "@am92/react-design-system";

export function Legend({ color, label }) {
  return (
    <DsBox sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <DsBox sx={{ width: 9, height: 9, borderRadius: 0.5, bgcolor: color }} />
      <DsTypography variant="supportRegularMetadata" color="text.secondary">
        {label}
      </DsTypography>
    </DsBox>
  );
}

export function Stat({ label, value, color }) {
  return (
    <DsBox>
      <DsTypography
        variant="bodyBoldSmall"
        sx={{ color: color || "text.primary" }}
      >
        {value}
      </DsTypography>
      <DsTypography variant="supportRegularMetadata" color="text.secondary">
        {label}
      </DsTypography>
    </DsBox>
  );
}

export function ScoreGauge({ score, light }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = light
    ? "#fff"
    : score >= 70
      ? PALETTE.successGreen
      : score >= 45
        ? PALETTE.warningOrange
        : PALETTE.errorRed;
  const trackColor = light ? "rgba(255,255,255,0.25)" : PALETTE.secondaryGrey30;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle
        cx="36"
        cy="36"
        r={r}
        stroke={trackColor}
        strokeWidth="7"
        fill="none"
      />
      <circle
        cx="36"
        cy="36"
        r={r}
        stroke={color}
        strokeWidth="7"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
    </svg>
  );
}
