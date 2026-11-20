import Link from "next/link";
import { PageIntro, Card } from "@/components/ui";

const rows = [
  ["Volatility-based range managers", "Past price swings", "Can't see scheduled events coming"],
  ["Options-based LP hedging", "Options markets", "Hedges a position, doesn't pick the range"],
  ["Price-bracket prediction markets", "Crowd odds", "A bet, not liquidity management"],
  ["Rangefinder", "Live crowd odds (Gemini)", "Picks the range, records it onchain, hedges it, and checks the crowd's track record"],
];

export default function WhyPage() {
  return (
    <>
      <PageIntro eyebrow="Why Rangefinder" title="Other LP tools look backward. Rangefinder looks forward.">
        <p>Liquidity providers earn fees only while the price stays inside the range they choose. Choosing that range is the hardest decision they make, and most tools make it by looking at the past.</p>
      </PageIntro>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">The problem</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            On Uniswap v3, a narrow range earns more fees but is easy to fall out of; when it does, the position stops earning and takes impermanent loss.
            Range tools usually size ranges from historical volatility, which can&apos;t anticipate a Fed decision tomorrow or a big announcement this afternoon.
          </p>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">The insight</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Prediction markets price the future directly, with real money behind every number. Gemini&apos;s daily BTC ladder gives
            the crowd&apos;s full forecast of where BTC will settle, which is exactly what an LP needs to choose a range.
          </p>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Why onchain</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Every range, rebalance and hedge is recorded in a smart contract, giving a public, tamper-proof history of each decision
            and the base for a vault that manages liquidity automatically.
          </p>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Why Gemini</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Gemini&apos;s prediction markets are regulated and expose market data, trade history, settlements and order placement through
            public APIs. We use all four: market data for the forecast, trade history and settlements for the report card, and order placement for protection.
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">How it compares</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr><th className="py-2 pr-4">Approach</th><th className="py-2 pr-4">Based on</th><th className="py-2">Limitation / difference</th></tr>
            </thead>
            <tbody>
              {rows.map(([a, b, c]) => (
                <tr key={a} className={`border-t border-white/5 ${a === "Rangefinder" ? "text-violet-200" : "text-slate-300"}`}>
                  <td className="py-2 pr-4 font-medium">{a}</td><td className="py-2 pr-4">{b}</td><td className="py-2">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Where it goes next</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li><b>Forecast oracle:</b> publish the crowd&apos;s forecast onchain so lending protocols, AMMs and vaults can use it.</li>
          <li><b>Optimal range engine:</b> choose the range with the best expected return after fees, out-of-range risk and hedge cost.</li>
          <li><b>Forecast-driven LP vault:</b> open and rebalance real Uniswap v3 positions automatically, widening before scheduled events.</li>
        </ol>
        <p className="mt-4 text-xs text-slate-400">Today: testnet and Gemini sandbox only; ranges are recorded onchain but no Uniswap position is opened yet; the odds-shift button is a labeled simulation.</p>
      </Card>

      <div className="mt-6">
        <Link href="/" className="rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-600">Try the forecast →</Link>
      </div>
    </>
  );
}