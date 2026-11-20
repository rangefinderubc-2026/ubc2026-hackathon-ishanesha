import { PageIntro, Card } from "@/components/ui";

export default function AboutPage() {
  return (
    <>
      <PageIntro eyebrow="About" title="About Rangefinder">
        <p>[Placeholder] Rangefinder was built in under a week at the University Blockchain Conference 2026 hackathon by a two-person team who wanted to make liquidity providing smarter and safer.</p>
      </PageIntro>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Our mission</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">[Placeholder] Give every liquidity provider access to the same forward-looking risk signals that professional traders use, in plain English, with every decision recorded transparently onchain.</p>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">The team</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            <li><b>[Name A]</b>: smart contract, onchain and Gemini trading integration. [GitHub / LinkedIn]</li>
            <li><b>[Name B]</b>: forecast math, history engine, frontend and design. [GitHub / LinkedIn]</li>
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Built with</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">Next.js, TypeScript, Tailwind CSS, Recharts, viem, Solidity (RangeVault on Base Sepolia), and Gemini Prediction Markets APIs (market data, trade history, settlements, sandbox orders).</p>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">[Placeholder] team@example.com · GitHub repo link · Devpost link</p>
        </Card>
      </div>

      <p className="mt-6 text-xs text-slate-500">Rangefinder is a hackathon prototype running on testnets and Gemini&apos;s sandbox. Nothing here is financial advice.</p>
    </>
  );
}