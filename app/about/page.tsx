import Link from "next/link";
import { PageIntro, Card } from "@/components/ui";

const REPO = "https://github.com/rangefinderubc-2026/ubc2026-hackathon-ishanesha";
const CONTRACT = "https://sepolia.basescan.org/address/0x47cd5D831bEcdD1d90F25f32B128b43598A4d1CA";

const team = [
  {
    name: "Ishan Ghosh",
    role: "Forecast & product",
    did: "Forecast math, the crowd report card and day replay, Watch mode, and the frontend and design.",
    link: "https://github.com/ghosh1330",
  },
  {
    name: "Esha Bapat",
    role: "Onchain & trading",
    did: "The RangeVault smart contract, onchain integration on Base Sepolia, and the Gemini sandbox trading integration.",
    link: "https://github.com/ebapat",
  },
];

const stack = [
  ["Gemini Prediction Markets", "Live odds, trade history, settlements, sandbox trading"],
  ["Solidity · Base Sepolia", "RangeVault contract: ranges, rebalances, hedges"],
  ["Next.js · TypeScript", "App, API routes, shared state"],
  ["viem", "Onchain transactions from the backend wallet"],
  ["Recharts · Tailwind CSS", "Charts and the purple/black interface"],
  ["Vercel", "Hosting and deploys"],
];

export default function AboutPage() {
  return (
    <>
      <PageIntro eyebrow="About" title="About Rangefinder">
        <p>
          Rangefinder was built in one week at the University Blockchain Conference 2026 hackathon by a two-person team.
          We wanted to answer one question: what if liquidity providers set their ranges using what the market <i>expects</i>,
          instead of what already happened?
        </p>
      </PageIntro>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Our mission</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Give every liquidity provider the same forward-looking risk signals that professional traders use, explained in plain
            English, with every decision recorded transparently onchain.
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Why we built it</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Prediction markets turn real money into real-time forecasts, but that signal rarely reaches DeFi. Rangefinder connects
            the two: Gemini&apos;s crowd sets the range, the blockchain keeps the receipts, and Gemini&apos;s own settlement data
            checks whether the crowd deserved to be trusted.
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">The team</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {team.map((m) => (
            <div key={m.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">{m.name}</p>
              <p className="text-xs uppercase tracking-wider text-violet-300">{m.role}</p>
              <p className="mt-2 text-sm text-slate-300">{m.did}</p>
              {m.link.startsWith("http") && (
                <a href={m.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-violet-300 underline">GitHub ↗</a>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Built with</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {stack.map(([tool, use]) => (
              <li key={tool} className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-2">
                <span className="text-slate-100">{tool}</span>
                <span className="text-slate-400">{use}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Where things stand</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>All market data is live from Gemini; transactions are real but on Base Sepolia testnet and Gemini&apos;s sandbox.</li>
            <li>The only simulated feature is the clearly labeled &ldquo;Simulate odds shift&rdquo; button.</li>
            <li>Ranges are recommended and recorded onchain; opening real Uniswap positions is our next step.</li>
          </ul>
          <p className="mt-4 text-sm text-slate-300">
            Curious why we think this matters? Read <Link href="/why" className="text-violet-300 underline">Why Rangefinder</Link>.
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Links</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a href={REPO} target="_blank" rel="noreferrer" className="rounded-lg border border-violet-400/50 px-4 py-2 text-violet-200 hover:bg-violet-400/10">GitHub repository ↗</a>
          <a href={CONTRACT} target="_blank" rel="noreferrer" className="rounded-lg border border-violet-400/50 px-4 py-2 text-violet-200 hover:bg-violet-400/10">RangeVault on Basescan ↗</a>
          <Link href="/" className="rounded-lg bg-violet-500 px-4 py-2 font-semibold text-white hover:bg-violet-600">Try the forecast →</Link>
        </div>
      </Card>

      <p className="mt-6 text-xs text-slate-500">
        Rangefinder is a hackathon prototype running on testnets and Gemini&apos;s sandbox. Nothing here is financial advice.
      </p>
    </>
  );
}