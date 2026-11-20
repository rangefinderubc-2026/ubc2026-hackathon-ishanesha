"use client";

import Link from "next/link";
import { PageIntro, HowTo, DataGate, Headline, Card, ForecastChart, ConfidenceSlider, Stats } from "@/components/ui";

export default function ForecastPage() {
  return (
    <>
      <PageIntro eyebrow="Feature 1 · Forecast" title="See where the crowd thinks BTC will finish">
        <p>
          Rangefinder reads Gemini&apos;s live BTC price ladder (about 20 contracts like &ldquo;BTC ≥ $62,000 at 4 PM&rdquo;) and turns
          their prices into one probability curve. Each price is the crowd&apos;s probability, backed by real money.
        </p>
        <p>
          From that curve it recommends the price range BTC is most likely to finish in, at the confidence you choose.
          That&apos;s the range a Uniswap v3 liquidity provider would use to keep earning fees.
        </p>
      </PageIntro>

      <DataGate>
        <Headline />
        <Card>
          <ForecastChart />
          <ConfidenceSlider />
          <Stats />
        </Card>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/actions" className="rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-600">Record this range onchain →</Link>
          <Link href="/report" className="rounded-lg border border-violet-400/50 px-4 py-2.5 text-sm text-violet-200 hover:bg-violet-400/10">How accurate is the crowd? →</Link>
        </div>
      </DataGate>

      <HowTo
        steps={[
          <>Read the headline: it&apos;s the range BTC will most likely finish in at today&apos;s 4 PM CST settlement.</>,
          <>Look at the chart: each dot is a real Gemini contract. The purple band is the recommended range, and the dashed line is the crowd&apos;s median (50/50 point).</>,
          <>Drag the <b>Target confidence</b> slider: higher means a wider, safer range; lower means a narrower range that earns more fees but is more likely to be left.</>,
          <>Check the stats: the chance BTC ends below or above the range, and what downside protection costs.</>,
          <>Happy with the range? Go to <b>Set &amp; Protect</b> to record it onchain.</>,
        ]}
        note="Data refreshes every 60 seconds. If a ladder expires within 3 hours, the next day's ladder is used."
      />
    </>
  );
}