"use client";

import { PageIntro, HowTo, DataGate, CurrentRange, ActionsPanel, ActivityLog } from "@/components/ui";

export default function ActionsPage() {
  return (
    <>
      <PageIntro eyebrow="Feature 2 · Set & Protect" title="Record the range onchain and hedge the downside">
        <p>
          <b>Set range</b> writes the recommended range, its odds and the Gemini market it came from to our RangeVault contract on Base Sepolia, a public record anyone can check.
          <b> Simulate odds shift</b> is a labeled demo: it pretends the crowd moved $500 lower and records the resulting rebalance.
        </p>
        <p>
          <b>Protect</b> places a real order on Gemini&apos;s sandbox exchange: it buys one NO contract at the strike just below the range, which pays $1 if BTC settles below it.
          At full scale you would buy enough contracts to cover the position; the order is then recorded onchain too.
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
          <>Check the current recommendation at the top. To change it, adjust the confidence on the Forecast page.</>,
          <>Click <b>1 · Set range onchain</b>. When the transaction is sent, click <b>View transaction ↗</b> in the Activity log to see it on Basescan.</>,
          <>Optional: click <b>2 · Simulate odds shift</b> to watch the range move and a rebalance get recorded. A banner marks it as simulated; click <b>Reset to live odds</b> to go back.</>,
          <>Click <b>3 · Protect downside</b>. The Activity log shows the Gemini sandbox order ID, then a second transaction recording that order onchain.</>,
        ]}
        note="Testnet and Gemini sandbox only: no real money. The sandbox uses the nearest sandbox contract, which can differ from the production strike shown."
      />
    </>
  );
}