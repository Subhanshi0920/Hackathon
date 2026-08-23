import { MONTHS, FILING_STATUS } from "../data/calculations.js";
import { Legend } from "./Small.jsx";

export default function FilingPulse() {
  const onTimeCount = FILING_STATUS.filter((s) => s === "on").length;
  const compliancePct = Math.round((onTimeCount / FILING_STATUS.length) * 100);

  return (
    <div className="rounded-xl p-5 md:p-6 mb-6 bg-navy-panel border border-hairline">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-disp text-[15px] font-semibold text-paper">12-Month Filing Pulse</div>
          <div className="text-[12.5px] text-ink-muted mt-0.5">Every GSTR-3B filing, on schedule or not</div>
        </div>
        <div className="text-right">
          <div className="font-mono font-disp text-[22px] font-bold text-gold-soft">{compliancePct}%</div>
          <div className="text-[11px] text-ink-muted">on-time compliance</div>
        </div>
      </div>

      <div className="flex items-end gap-2 md:gap-3 h-16">
        {FILING_STATUS.map((s, i) => {
          const color = s === "on" ? "#3FA796" : s === "late" ? "#C9962C" : "#E0554F";
          const h = s === "on" ? 54 : s === "late" ? 38 : 20;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="tick rounded-sm w-full opacity-90"
                style={{ height: h, background: color }}
              />
              <div className="font-mono text-[10px] text-ink-muted">{MONTHS[i]}</div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-5 mt-4">
        <Legend color="#3FA796" label="Filed on time" />
        <Legend color="#C9962C" label="Filed late" />
        <Legend color="#E0554F" label="Missed" />
      </div>
    </div>
  );
}
