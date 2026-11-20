"use client";

import { PageIntro, HowTo, DataGate, CurrentRange, ActionsPanel, ActivityLog } from "@/components/ui";

export default function ActionsPage() {
  return (
    <>
      <PageIntro eyebrow="Feature 2 · Set & Protect" title="Record the range onchain and hedge the downside">
        <p>
          <b>Set range</b> writes the recommended range to our RangeVault smart contract, creating a permanent, public record of every decision.
          <b> Simulate odds shift</b> is a demo that pretends the crowd moved $500 lower and records the rebalance.
        </p>
        <p>
          <b>Protect</b> places a real order on Gemini&apos;s test exchange: it buys a contract that pays out if BTC falls below the range,
          offsetting the loss when the price escapes, and records that order onchain too.
        </p>
      </PageIntro>

      <DataGate>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <CurrentRange />
            <ActionsPanel />
          </div>
          <ActivityLog />
        </div>
      </DataGate>

      <HowTo
        steps={[
          <>Check the current recommendation at the top (change the confidence on the Forecast page).</>,
          <>Click <b>1 · Set range onchain</b>. A transaction is sent; click <b>View transaction ↗</b> in the activity log to see it on the blockchain explorer.</>,
          <>Optional demo: click <b>2 · Simulate odds shift</b> to see a rebalance. It&apos;s clearly labeled as simulated; use <b>Reset to live odds</b> to go back.</>,
          <>Click <b>3 · Protect downside</b>. You&apos;ll see the Gemini sandbox order ID, then a second transaction recording the protection onchain.</>,
        ]}
        note="Testnet and Gemini sandbox only: no real money. The sandbox uses the nearest sandbox contract, which can differ from the production strike shown."
      />
    </>
  );
}