/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceArea, ReferenceLine, ResponsiveContainer,
} from "recharts";
import ReportCard from "./ReportCard";
import PixelGlasses from "./PixelGlasses";
import { spreadPct, moodFor, MOOD_COLOR, MOOD_TEXT } from "./mood";
import { useRange, usd, pct, clock, USE_MOCKS, MOCK_PROTECT, POLL_MS, MIN_GAP_MS, MAX_PER_HOUR } from "./RangeProvider";

// Purple / black palette
const C = { accent: "#A78BFA", fill: "#8B5CF6", bg: "#0A0710", grid: "#ffffff14", axis: "#9CA3AF", muted: "#6B6480" };

const LINKS: [string, string][] = [
  ["/", "Forecast"],
  ["/actions", "Set & Protect"],
  ["/watch", "Watch mode"],
  ["/report", "Report card"],
  ["/why", "Why Rangefinder"],
  ["/about", "About"],
];

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/10 bg-[#151022] p-5 ${className}`}>{children}</section>;
}

function useMood() {
  const { data } = useRange();
  const mood = moodFor(spreadPct(data?.curve));
  return { mood, color: MOOD_COLOR[mood], text: MOOD_TEXT[mood] };
}

export function Nav() {
  const path = usePathname();
  const { watch } = useRange();
  const { color, text } = useMood();
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0710]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <PixelGlasses size={30} glint={color} title={`Rangefinder. ${text}.`} />
          <span><span className="text-violet-400">Range</span>finder</span>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {LINKS.map(([href, label]) => (
            <Link
              key={href} href={href}
              className={`rounded-lg px-3 py-1.5 transition ${path === href ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-violet-400/40 px-3 py-1 text-violet-300">Live Gemini data</span>
          {watch && <span className="rounded-full border border-violet-400/40 bg-violet-400/10 px-3 py-1 text-violet-200">● Watching</span>}
          {USE_MOCKS && <span className="rounded-full border border-amber-400/40 px-3 py-1 text-amber-300">Onchain: mocked</span>}
          {MOCK_PROTECT && <span className="rounded-full border border-amber-400/40 px-3 py-1 text-amber-300">Gemini order: mocked</span>}
        </div>
      </div>
    </header>
  );
}

export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="mb-8 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold md:text-4xl">{title}</h1>
      <div className="mt-3 max-w-3xl space-y-2 leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

export function HowTo({ steps, note }: { steps: ReactNode[]; note?: ReactNode }) {
  return (
    <Card className="mt-8">
      <h2 className="text-lg font-semibold">How to use it</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-300">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-200">{i + 1}</span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
      {note && <p className="mt-4 text-xs text-slate-400">{note}</p>}
    </Card>
  );
}

export function DataGate({ children }: { children: ReactNode }) {
  const { data, error, reload } = useRange();
  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
        Couldn&apos;t load Gemini data: {error}
        <button onClick={reload} className="ml-3 underline">Retry</button>
      </div>
    );
  }
  if (!data) return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  return <>{children}</>;
}

function SimBadge() {
  const { data } = useRange();
  if (!data || data.shift === 0) return null;
  return (
    <p className="mt-3 inline-block rounded-md bg-amber-400/10 px-3 py-1 text-sm text-amber-300">
      Simulated odds shift: crowd moved {usd(Math.abs(data.shift))} lower (demo)
    </p>
  );
}

export function Headline() {
  const { data } = useRange();
  const { color, text } = useMood();
  if (!data) return null;
  return (
    <section className="mb-6">
      <p className="mb-2 text-sm text-slate-400">Gemini crowd forecast · {data.title} · settles {data.expiryCentral}</p>
      <h2 className="text-4xl font-bold leading-tight md:text-5xl">
        <span className="text-violet-300">{pct(data.probInRange)}</span> chance BTC ends between{" "}
        <span className="font-mono">{usd(data.lower)}</span> and <span className="font-mono">{usd(data.upper)}</span>
      </h2>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-slate-400">
        <PixelGlasses size={20} glint={color} title={`${text}.`} />
        <span>{text}. The glint turns gold, amber or coral with the crowd&apos;s confidence.</span>
      </p>
      <SimBadge />
    </section>
  );
}

export function CurrentRange() {
  const { data } = useRange();
  if (!data) return null;
  return (
    <Card>
      <p className="text-xs text-slate-400">Current recommendation · {data.title} · settles {data.expiryCentral}</p>
      <p className="mt-1 text-2xl font-bold">
        <span className="text-violet-300">{pct(data.probInRange)}</span>{" · "}
        <span className="font-mono">{usd(data.lower)} – {usd(data.upper)}</span>
      </p>
      <p className="mt-1 text-xs text-slate-400">
        At {pct(data.confidence)} confidence · median {usd(data.median)} · change it on the{" "}
        <Link href="/" className="text-violet-300 underline">Forecast</Link> page
      </p>
      <SimBadge />
    </Card>
  );
}

export function ForecastChart() {
  const { data, prevCurve, loading } = useRange();
  if (!data) return null;
  const xMin = Math.min(data.lower, data.curve[0]?.strike ?? data.lower) - 500;
  const xMax = Math.min(data.curve[data.curve.length - 1]?.strike ?? data.upper, data.upper + 2500);
  return (
    <>
      <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
        <span>Chance BTC finishes above each price</span>
        {loading && <span className="text-xs">updating…</span>}
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 24, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={C.grid} />
            <XAxis dataKey="strike" type="number" domain={[xMin, xMax]} allowDataOverflow tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} stroke={C.axis} fontSize={12} />
            <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} stroke={C.axis} fontSize={12} />
            <Tooltip contentStyle={{ background: C.bg, border: "1px solid #3b2f5c" }} labelFormatter={(v) => `BTC above ${usd(Number(v))}`} formatter={(v: any) => [pct(Number(v)), "Chance"]} />
            <ReferenceArea x1={data.lower} x2={data.upper} fill={C.fill} fillOpacity={0.15} />
            <ReferenceLine x={data.median} stroke={C.accent} strokeDasharray="4 4" label={{ value: "median", fill: C.accent, fontSize: 11, position: "top" }} />
            {prevCurve && <Line data={prevCurve} dataKey="pAbove" type="monotone" stroke={C.muted} strokeDasharray="5 5" dot={false} name="Before shift" isAnimationActive={false} />}
            <Line data={data.curve} dataKey="pAbove" type="monotone" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3 }} name="Now" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function ConfidenceSlider() {
  const { confidence, setConfidence } = useRange();
  return (
    <div className="mt-4">
      <label className="flex items-center justify-between text-sm">
        <span className="text-slate-300">Target confidence</span>
        <span className="font-mono text-violet-300">{pct(confidence)}</span>
      </label>
      <input
        type="range" min={0.5} max={0.9} step={0.05} value={confidence}
        onChange={(e) => setConfidence(Number(e.target.value))}
        className="mt-2 w-full accent-violet-500" aria-label="Target confidence"
      />
      {confidence > 0.8 && <p className="mt-1 text-xs text-amber-300">Above 80%, the range extends past Gemini&apos;s listed prices, so the edges are estimated.</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 font-mono">{value}</div>
    </div>
  );
}

export function Stats() {
  const { data } = useRange();
  if (!data) return null;
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
      <Stat label="Crowd median" value={usd(data.median)} />
      <Stat label="Chance below range" value={pct(data.probBelow)} />
      <Stat label="Chance above range" value={pct(data.probAbove)} />
      <Stat label="Protection cost" value={data.protection.noPrice !== undefined ? `$${data.protection.noPrice.toFixed(2)} / contract` : "—"} />
    </div>
  );
}

function ActionButton({ children, onClick, busy, disabled }: { children: ReactNode; onClick: () => void; busy: boolean; disabled: boolean }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="rounded-lg bg-violet-500 px-4 py-2.5 text-left text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "Working…" : children}
    </button>
  );
}

export function ActionsPanel() {
  const { data, busy, shift, watch, onSetRange, onSimulateShift, onProtect, onReset } = useRange();
  return (
    <Card>
      <h3 className="mb-3 font-semibold">Actions</h3>
      <div className="flex flex-col gap-2">
        <ActionButton onClick={onSetRange} busy={busy === "set"} disabled={!!busy}>1 · Set range onchain</ActionButton>
        <ActionButton onClick={onSimulateShift} busy={busy === "shift"} disabled={!!busy || shift !== 0 || watch}>2 · Simulate odds shift (−$500)</ActionButton>
        <ActionButton onClick={onProtect} busy={busy === "protect"} disabled={!!busy}>3 · Protect downside (Gemini sandbox)</ActionButton>
        {shift !== 0 && <button onClick={onReset} className="mt-1 text-xs text-slate-400 underline">Reset to live odds</button>}
      </div>
      {watch && <p className="mt-2 text-xs text-slate-400">Simulate is disabled while Watch mode is on.</p>}
      {data && <p className="mt-3 text-xs text-slate-400">{data.protection.explain}</p>}
    </Card>
  );
}

export function ActivityLog() {
  const { log } = useRange();
  return (
    <Card className="flex-1">
      <h3 className="mb-3 font-semibold">Activity</h3>
      {log.length === 0 ? (
        <p className="text-sm text-slate-400">No actions yet. Start with “Set range onchain”.</p>
      ) : (
        <ul className="max-h-[32rem] space-y-3 overflow-y-auto pr-1 text-sm">
          {log.map((e, i) => (
            <li key={i} className="border-l-2 border-violet-400/50 pl-3">
              <div className="flex justify-between gap-2">
                <span className={e.label === "Error" ? "text-red-300" : "text-slate-100"}>{e.label}</span>
                <span className="shrink-0 text-xs text-slate-500">{e.time}</span>
              </div>
              {e.detail && <div className="break-all text-xs text-slate-400">{e.detail}{e.mock && " (mock)"}</div>}
              {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="text-xs text-violet-300 underline">View transaction ↗</a>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function WatchPanel() {
  const { watch, threshold, setThreshold, recorded, autoTimes, lastCheck, busy, onToggleWatch, checkNow } = useRange();
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Watch mode</h3>
        <button
          onClick={onToggleWatch} aria-pressed={watch}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${watch ? "bg-violet-500 text-white" : "border border-white/20 text-slate-300"}`}
        >
          {watch ? "On" : "Off"}
        </button>
      </div>
      <p className="text-xs text-slate-400">Re-checks live Gemini odds every {POLL_MS / 1000}s and rebalances onchain when the crowd median moves more than the trigger.</p>
      <label className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-300">Trigger</span>
        <select value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="rounded-md border border-white/20 bg-[#0A0710] px-2 py-1 text-sm">
          <option value={0.1}>10% of range width</option>
          <option value={0.2}>20% of range width</option>
          <option value={0.3}>30% of range width</option>
        </select>
      </label>
      <ul className="mt-3 space-y-1 text-xs text-slate-400">
        <li>Recorded range: {recorded ? `${usd(recorded.lower)} – ${usd(recorded.upper)} (median ${usd(recorded.median)})` : <>none yet. <Link href="/actions" className="text-violet-300 underline">Set range first</Link></>}</li>
        <li>Guardrails: ≥{MIN_GAP_MS / 60_000} min between auto-rebalances · max {MAX_PER_HOUR}/hour</li>
        <li>Auto-rebalances this hour: {autoTimes.length}/{MAX_PER_HOUR}</li>
        {lastCheck && <li>Last check: {lastCheck}</li>}
      </ul>
      <button
        onClick={checkNow} disabled={!!busy}
        className="mt-3 w-full rounded-lg border border-violet-400/50 px-3 py-2 text-sm text-violet-200 hover:bg-violet-400/10 disabled:opacity-50"
      >
        {busy === "watch" ? "Checking…" : "Check live odds now"}
      </button>
    </Card>
  );
}

export function TimelineChart() {
  const { snaps, recorded, confidence } = useRange();
  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Live odds timeline</h3>
        <span className="text-xs text-slate-400">Real Gemini odds · every {POLL_MS / 1000}s · since page opened</span>
      </div>
      <p className="mb-3 text-xs text-slate-400">Crowd median (solid) and {pct(confidence)} range (dashed). Shaded band = range currently recorded onchain.</p>
      {snaps.length < 2 ? (
        <p className="py-10 text-center text-sm text-slate-400">Collecting live data… {snaps.length} point{snaps.length === 1 ? "" : "s"} so far (a new one every {POLL_MS / 1000}s).</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={snaps} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={C.grid} />
              <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(t) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} stroke={C.axis} fontSize={12} />
              <YAxis domain={["dataMin - 300", "dataMax + 300"]} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} stroke={C.axis} fontSize={12} width={60} />
              <Tooltip contentStyle={{ background: C.bg, border: "1px solid #3b2f5c" }} labelFormatter={(t) => clock(Number(t))} formatter={(v: any, name: any) => [usd(Number(v)), name]} />
              {recorded && <ReferenceArea y1={recorded.lower} y2={recorded.upper} fill={C.fill} fillOpacity={0.1} />}
              <Line dataKey="upper" name="Upper" stroke={C.muted} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              <Line dataKey="median" name="Median" stroke={C.accent} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
              <Line dataKey="lower" name="Lower" stroke={C.muted} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function ReportSection() {
  const { confidence } = useRange();
  return <ReportCard confidence={confidence} />;
}