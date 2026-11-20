"use client";

import Link from "next/link";
import { PageIntro, HowTo, DataGate, Headline, Card, ForecastChart, ConfidenceSlider, Stats } from "@/components/ui";

export default function ForecastPage() {
  return (
    <>
      <PageIntro eyebrow="Feature 1 · Forecast" title="See where the crowd thinks BTC will finish">
        <p>
          Rangefinder reads Gemini&apos;s live BTC price ladder: a set of contracts like &ldquo;BTC ≥ $62,000 at 4 PM CT&rdquo;, one for each price level.
          A contract&apos;s price works as the crowd&apos;s probability, backed by real money, and Rangefinder joins them into one curve.
        </p>
        <p>
          From that curve it builds a range centered on the crowd&apos;s median that BTC should finish inside with the confidence you choose.
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
          <>Read the headline: the chance BTC finishes inside the recommended range at the next 4 PM CT settlement (shown above the headline).</>,
          <>Look at the chart: each dot is a live Gemini contract and its implied chance of BTC finishing above that price. The shaded band is the recommended range; the dashed line is the crowd&apos;s median (the 50/50 point).</>,
          <>Drag the <b>Target confidence</b> slider (50–90%): higher gives a wider, safer range; lower gives a narrower range that earns more fees while BTC stays inside but is more likely to be left.</>,
          <>Check the stats: the crowd&apos;s median, the chance BTC ends below or above the range, and the price of one downside protection contract.</>,
          <>Happy with the range? Go to <b>Set &amp; Protect</b> to record it onchain.</>,
        ]}
        note="Live data refreshes every 60 seconds. When today's ladder settles in under 3 hours, Rangefinder switches to the next day's ladder, since odds that close to settlement are nearly all 0% or 100%."
      />
    </>
  );
}