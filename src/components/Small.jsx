export function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="rounded-sm w-[9px] h-[9px]" style={{ background: color }} />
      <span className="text-[11px] text-ink-muted">{label}</span>
    </div>
  );
}

export function Stat({ label, value, colorClass }) {
  return (
    <div>
      <div className={`font-mono text-[13px] font-semibold ${colorClass || "text-paper"}`}>{value}</div>
      <div className="text-[10px] text-ink-muted">{label}</div>
    </div>
  );
}

export function ScoreGauge({ score }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 70 ? "#3FA796" : score >= 45 ? "#C9962C" : "#E0554F";
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} stroke="#24406B" strokeWidth="7" fill="none" />
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
