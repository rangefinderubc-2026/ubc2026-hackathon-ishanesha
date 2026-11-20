"use client";

import { PageIntro, HowTo, ReportSection, ReplaySection } from "@/components/ui";

export default function ReportPage() {
  return (
    <>
      <PageIntro eyebrow="Feature 4 · Report card" title="Can you trust the crowd?">
        <p>
          For each of the last 5 daily BTC markets, Rangefinder rebuilds what Gemini&apos;s crowd predicted a few hours before settlement,
          from the last real trade of every contract, and checks it against Gemini&apos;s official settlement price.
        </p>
        <p>It shows how often BTC finished inside the crowd&apos;s range, whether the crowd was over- or underconfident, and on which days the downside protection would have paid out. Five days is a small sample, so treat it as a sanity check, not proof.</p>
      </PageIntro>

      <ReportSection />

      <div className="mt-6">
        <ReplaySection />
      </div>

      <HowTo
        steps={[
          <>Read the headline: how many scored days settled inside the crowd&apos;s range. Compare the hit rate with your target confidence.</>,
          <>On the chart, purple dots mean BTC settled inside the range and red dots mean it didn&apos;t. Dashed lines are the range edges and the solid line is the crowd&apos;s median.</>,
          <>Change <b>Forecast taken</b> (3h, 6h or 12h before settlement) to see how early the crowd was right.</>,
          <>The confidence from the Forecast page applies here too. Try 50% and then 90% to see the trade-off. The first load takes about 10 seconds.</>,
          <>In <b>Replay a past day</b>, pick a date to watch the crowd&apos;s forecast move hour by hour, and compare it with where BTC actually settled (gold line).</>,
        ]}
        note="Method: last Gemini trade of each contract before the snapshot time → crowd curve → range → compared with Gemini's official settlement value. Days with too little trading, or a curve too jumpy to trust, are marked “not scored.”"
      />
    </>
  );
}