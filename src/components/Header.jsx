import { Landmark, CheckCircle2 } from "lucide-react";
import { BORROWER } from "../data/calculations.js";

export default function Header() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-hairline">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded w-9 h-9 bg-gold">
          <Landmark size={19} className="text-navy-deep" />
        </div>
        <div>
          <div className="font-disp text-[17px] font-bold tracking-wide text-paper">CreditPulse</div>
          <div className="font-mono text-[11px] text-ink-muted">SME Lending Intelligence</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-[13px] font-semibold text-paper">{BORROWER.name}</div>
          <div className="font-mono text-[11px] text-ink-muted">GSTIN {BORROWER.gstin}</div>
        </div>
        <div className="rounded-full flex items-center gap-1 px-3 py-1 bg-cp-green/10 border border-cp-green">
          <CheckCircle2 size={13} className="text-cp-green" />
          <span className="font-mono text-[11px] text-cp-green">Live sync</span>
        </div>
      </div>
    </div>
  );
}
