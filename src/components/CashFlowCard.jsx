import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, AlertTriangle, Info } from "lucide-react";
import { CASHFLOW, describeCashFlowModel } from "../data/calculations.js";

// recharts trick for a shaded band: stack a transparent "low" area, then a
// visible "high - low" area on top of it, so only the gap between the two
// gets filled.
const chartData = CASHFLOW.map((c) => ({
  ...c,
  bandBase: c.low,
  bandHeight: c.low != null && c.high != null ? +(c.high - c.low).toFixed(2) : null,
}));

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-lg px-3 py-2 text-[12px]" style={{ background: "#16335C", border: "1px solid #24406B" }}>
      <div className="text-paper font-semibold mb-1">{label}</div>
      {row.actual != null && <div className="text-gold-soft">Actual: ₹{row.actual}L</div>}
      {row.base != null && (
        <>
          <div className="text-cp-green">Base: ₹{row.base}L</div>
          <div className="text-ink-muted">Range: ₹{row.low}L to ₹{row.high}L</div>
        </>
      )}
    </div>
  );
}

export default function CashFlowCard() {
  const dip = chartData.find((c) => c.base !== null && c.base < 0);
  const model = describeCashFlowModel();

  return (
    <div className="rounded-xl p-5 md:col-span-2 bg-navy-panel border border-hairline">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-gold" />
          <span className="font-disp text-[13.5px] font-semibold text-paper">Cash-Flow Forecast</span>
        </div>
        <span className="font-mono text-[11px] text-ink-muted">₹ lakhs, net monthly</span>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8C468" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#E8C468" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#24406B" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="m" tick={{ fill: "#8AA0C4", fontSize: 11 }} axisLine={{ stroke: "#24406B" }} tickLine={false} />
            <YAxis tick={{ fill: "#8AA0C4", fontSize: 11 }} axisLine={false} tickLine={false} />
            <ReferenceLine y={0} stroke="#E0554F" strokeDasharray="2 3" />
            <Tooltip content={<CustomTooltip />} />

            {/* Actual, bank-confirmed cash flow */}
            <Area type="monotone" dataKey="actual" stroke="#E8C468" strokeWidth={2} fill="url(#actualFill)" connectNulls name="Actual" />

            {/* Confidence band: invisible base + visible fill on top of it */}
            <Area type="monotone" dataKey="bandBase" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area type="monotone" dataKey="bandHeight" stackId="band" stroke="none" fill="#3FA796" fillOpacity={0.18} isAnimationActive={false} />

            {/* Base-case forecast line */}
            <Line type="monotone" dataKey="base" stroke="#3FA796" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls name="Base forecast" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {dip && (
        <div className="flex items-center gap-2 mt-2 rounded-lg px-3 py-2 bg-cp-red/10 border border-cp-red/35">
          <AlertTriangle size={13} className="text-cp-red shrink-0" />
          <span className="text-[11.5px] text-paper">
            Base-case forecast dips negative in <strong>{dip.m}</strong> — see range band for best/worst case.
          </span>
        </div>
      )}

      <div className="flex items-start gap-2 mt-2 rounded-lg px-3 py-2 bg-navy-panel-2 border border-hairline">
        <Info size={13} className="text-ink-muted shrink-0 mt-0.5" />
        <span className="text-[11px] text-ink-muted leading-relaxed">
          Model: receipts typically land <strong className="text-paper">{model.lagMonths} month{model.lagMonths === 1 ? "" : "s"}</strong> after
          invoicing, at a <strong className="text-paper">{model.collectionRatePct}%</strong> collection rate — calibrated from this
          business's own bank history. {model.stressAssumption}
        </span>
      </div>
    </div>
  );
}
