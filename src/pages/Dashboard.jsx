import Header from "../components/Header.jsx";
import FilingPulse from "../components/FilingPulse.jsx";
import HealthScoreCard from "../components/HealthScoreCard.jsx";
import CashFlowCard from "../components/CashFlowCard.jsx";
import { TurnoverCard, WorkingCapitalCard, ConnectorsCard } from "../components/SecondaryCards.jsx";

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-navy-deep text-paper font-body">
            <div className="w-full px-6 py-6 md:px-10 md:py-8 max-w-[1180px] mx-auto">
                <Header />

                <FilingPulse />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                    <HealthScoreCard />
                    <CashFlowCard />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <TurnoverCard />
                    <WorkingCapitalCard />
                    <ConnectorsCard />
                </div>

                <div className="text-center mt-8 text-[10.5px] text-ink-muted">
                    Demo data — for hackathon presentation purposes only.
                </div>
            </div>
        </div>
    );
}
