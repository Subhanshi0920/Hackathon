import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { FileText, Wallet, Link2, ArrowUpRight } from "lucide-react";
import { TURNOVER, MONTHS, CONNECTORS } from "../data/calculations.js";
import { Stat } from "./Small.jsx";

export function TurnoverCard() {
  const data = TURNOVER.map((v, i) => ({ m: MONTHS[i], v }));
  return (
    <div className="rounded-xl p-5 bg-navy-panel border border-hairline">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-gold" />
        <span className="font-disp text-[13.5px] font-semibold text-paper">GST Turnover Trend</span>
      </div>
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <XAxis dataKey="m" tick={{ fill: "#8AA0C4", fontSize: 9.5 }} axisLine={false} tickLine={false} interval={1} />
            <YAxis hide />
            <Bar dataKey="v" radius={[3, 3, 0, 0]} fill="#E8C468" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between mt-2">
        <Stat label="12-mo avg" value="₹10.0L" />
        <Stat label="YoY growth" value="+18%" colorClass="text-cp-green" />
      </div>
    </div>
  );
}

export function WorkingCapitalCard() {
  return (
    <div className="rounded-xl p-5 bg-navy-panel border border-gold">
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={16} className="text-gold" />
        <span className="font-disp text-[13.5px] font-semibold text-paper">Working Capital Recommendation</span>
      </div>
      <div className="font-mono font-disp text-[24px] font-bold text-gold-soft">₹8.0L</div>
      <div className="text-[11.5px] text-ink-muted mb-2.5">Overdraft facility · 12-month tenure</div>
      <ul className="text-[11.5px] text-paper leading-loose pl-3.5 list-disc">
        <li>Covers projected Dec shortfall with buffer</li>
        <li>Sized to 0.8× average monthly turnover</li>
        <li>Interest-only draws against filed GST invoices</li>
      </ul>
      <button className="mt-3 w-full flex items-center justify-center gap-1 rounded-lg py-2.5 bg-gold text-navy-deep text-[12.5px] font-semibold border-none cursor-pointer">
        Send offer <ArrowUpRight size={14} />
      </button>
    </div>
  );
}

export function ConnectorsCard() {
  return (
    <div className="rounded-xl p-5 bg-navy-panel border border-hairline">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={16} className="text-gold" />
        <span className="font-disp text-[13.5px] font-semibold text-paper">Connected Sources</span>
      </div>
      <div className="flex flex-col gap-2">
        {CONNECTORS.map((c) => (
          <div
            key={c.name}
            className={`conn-pill flex items-center justify-between rounded-lg px-3 py-2 border ${
              c.connected ? "border-cp-green bg-cp-green/10" : "border-hairline"
            }`}
          >
            <div>
              <div className="text-[12px] font-semibold text-paper">{c.name}</div>
              <div className="text-[10.5px] text-ink-muted">{c.desc}</div>
            </div>
            <span className={`font-mono text-[10px] ${c.connected ? "text-cp-green" : "text-ink-muted"}`}>
              {c.connected ? "Connected" : "Connect"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
