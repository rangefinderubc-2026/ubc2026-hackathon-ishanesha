"use client";

import { PageIntro, HowTo, DataGate, CurrentRange, TimelineChart, WatchPanel, ActivityLog } from "@/components/ui";

export default function WatchPage() {
  return (
    <>
      <PageIntro eyebrow="Feature 3 · Watch mode" title="A bot that follows the crowd, with guardrails">
        <p>
          Every 60 seconds Rangefinder re-reads Gemini&apos;s live odds and plots how the crowd&apos;s forecast moves.
          With Watch mode on, it compares the live median with the range recorded onchain and <b>rebalances automatically</b> when the median moves further than your trigger.
        </p>
        <p>
          Guardrails keep it in check: at least 5 minutes between automatic rebalances, at most 3 per hour, and every decision is logged. It runs in your browser, so it watches while this tab stays open.
        </p>
      </PageIntro>

      <DataGate>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <CurrentRange />
            <TimelineChart />
          </div>
          <div className="flex flex-col gap-6">
            <WatchPanel />
            <ActivityLog />
          </div>
        </div>
      </DataGate>

      <HowTo
        steps={[
          <>Record a range first on <b>Set &amp; Protect</b>. Watch mode needs something to compare against.</>,
          <>Turn <b>Watch mode</b> On and pick a <b>Trigger</b> (how far the median must move, as a share of the range width).</>,
          <>Keep this browser tab open. It keeps watching when you switch pages inside Rangefinder, and the timeline gains a point every minute.</>,
          <>Click <b>Check live odds now</b> to run a check immediately. The Activity log explains every decision: no rebalance needed, rebalanced, or blocked by a guardrail.</>,
        ]}
        note="Demo tip: Set range → Simulate odds shift → Reset to live odds → Watch On, trigger 10% → Check now. The bot sees live odds differ from the recorded range and rebalances onchain."
      />
    </>
  );
}