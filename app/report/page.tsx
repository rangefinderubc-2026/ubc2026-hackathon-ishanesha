import { PageIntro, HowTo, ReportSection } from "@/components/ui";

export default function ReportPage() {
  return (
    <>
      <PageIntro eyebrow="Feature 4 · Report card" title="Can you trust the crowd?">
        <p>
          For each of the last 5 days, Rangefinder rebuilds what Gemini&apos;s crowd predicted hours before settlement,
          using real Gemini trade history, and checks it against Gemini&apos;s official settlement price.
        </p>
        <p>It shows how often BTC finished inside the crowd&apos;s range, whether the crowd was over- or underconfident, and on which days the downside protection would have paid out.</p>
      </PageIntro>

      <ReportSection />

      <HowTo
        steps={[
          <>Read the headline: how many recent days settled inside the crowd&apos;s range, versus the target confidence.</>,
          <>On the chart, purple dots mean BTC settled inside the range and red dots mean it didn&apos;t. Dashed lines are the range edges and the solid line is the crowd&apos;s median.</>,
          <>Change <b>Forecast taken</b> (3h, 6h or 12h before settlement) to see how early the crowd was right.</>,
          <>The confidence from the Forecast page applies here too. Try 50% vs 90% to see the trade-off.</>,
        ]}
        note="Method: last Gemini trade of each contract before the snapshot time → crowd curve → range → compared with Gemini's settlementValue. Days with too little trading are marked “not scored.”"
      />
    </>
  );
}