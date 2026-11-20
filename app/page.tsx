/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import ReportCard from "@/components/ReportCard";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceArea, ReferenceLine, ResponsiveContainer,
} from "recharts";

type Point = { strike: number; pAbove: number; symbol: string; bid?: number };
type CurveResp = {
  summary: string; event: string; title: string; expiry: string; expiryCentral: string;
  confidence: number; shift: number; median: number; lower: number; upper: number;
  probInRange: number; probBelow: number; probAbove: number;
  protection: { symbol: string; strike: number; noPrice?: number; explain: string };
  curve: Point[];
};
type LogEntry = { time: string; label: string; detail: string; url?: string | null; mock?: boolean };
type Snap = { t: number; median: number; lower: number; upper: number; probInRange: number };
type Recorded = { lower: number; upper: number; median: number; at: number };

// Contract calls mocked until Person A's /api/onchain is live
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
// Gemini protection order: real by default (A's /api/protect already works)
const MOCK_PROTECT = process.env.NEXT_PUBLIC_MOCK_PROTECT === "true";
const SHIFT = -500;

// Live odds + watch mode settings
const POLL_MS = 60_000;          // re-check Gemini every 60 s
const MIN_GAP_MS = 5 * 60_000;   // guardrail: ≥ 5 min between automatic rebalances
const MAX_PER_HOUR = 3;          // guardrail: ≤ 3 automatic rebalances per hour
const MAX_SNAPS = 120;           // keep the last ~2 hours of points

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const pct = (n: number) => Math.round(n * 100) + "%";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clock = (t: number = Date.now()) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { error: text || `HTTP ${res.status}` }; }
  if (!res.ok || data?.error) {
    throw new Error(typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? data));
  }
  return data as T;
}

async function postOnchain(body: object): Promise<{ hash: string; url?: string | null; mock?: boolean }> {
  if (USE_MOCKS) { await sleep(1000); return { hash: "0xMOCK", url: null, mock: true }; }
  return getJson("/api/onchain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

async function postProtect(body: object): Promise<{ orderId: string; symbol: string; status?: string; mock?: boolean }> {
  if (MOCK_PROTECT) { await sleep(1000); return { orderId: "MOCK-ORDER-1", symbol: "MOCK", status: "mock", mock: true }; }
  const r: any = await getJson("/api/protect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ...r, orderId: String(r.orderId) }; // keep as string: too big for a JS number
}

export default function Home() {
  const [confidence, setConfidence] = useState(0.7);
  const [shift, setShift] = useState(0);
  const [data, setData] = useState<CurveResp | null>(null);
  const [prevCurve, setPrevCurve] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "set" | "shift" | "protect" | "watch">(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  // live odds timeline + watch mode
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [recorded, setRecorded] = useState<Recorded | null>(null);
  const [watch, setWatch] = useState(false);
  const [threshold, setThreshold] = useState(0.2); // trigger = % of recorded range width
  const [autoTimes, setAutoTimes] = useState<number[]>([]);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const addLog = (e: Omit<LogEntry, "time">) => setLog((l) => [{ time: clock(), ...e }, ...l]);
  const addSnap = (d: CurveResp) =>
    setSnaps((s) => [...s.slice(-(MAX_SNAPS - 1)), { t: Date.now(), median: d.median, lower: d.lower, upper: d.upper, probInRange: d.probInRange }]);

  const load = useCallback(async (conf: number, sh: number) => {
    setLoading(true);
    try {
      const d = await getJson<CurveResp>(`/api/curve?confidence=${conf}&shift=${sh}`);
      setData(d);
      if (sh === 0) addSnap(d); // the timeline only records real (unshifted) odds
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // re-fetch when the slider or shift changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => load(confidence, shift), 250);
    return () => clearTimeout(t);
  }, [confidence, shift, load]);

  // ---- Watch mode: compare live odds with the range recorded onchain ----
  async function evaluate(live: CurveResp, manual: boolean) {
    const rec = recorded;
    if (!rec) {
      if (manual) addLog({ label: "Watch check skipped", detail: "No range recorded onchain yet. Click “Set range onchain” first." });
      return;
    }
    const width = rec.upper - rec.lower;
    const moved = Math.abs(live.median - rec.median);
    const trigger = threshold * width;
    const summary = `Median ${usd(rec.median)} → ${usd(live.median)} (moved ${usd(moved)}, trigger ${usd(trigger)})`;
    setLastCheck(`${clock()}: ${summary}`);

    if (moved < trigger) {
      if (manual) addLog({ label: "Watch check: no rebalance needed", detail: summary });
      return;
    }
    const now = Date.now();
    const lastHour = autoTimes.filter((t) => now - t < 60 * 60_000);
    const last = lastHour[lastHour.length - 1];
    if (last && now - last < MIN_GAP_MS) {
      addLog({ label: "Watch: rebalance blocked (cooldown)", detail: `${summary}. Next allowed at ${clock(last + MIN_GAP_MS)}` });
      return;
    }
    if (lastHour.length >= MAX_PER_HOUR) {
      addLog({ label: "Watch: rebalance blocked (hourly cap)", detail: `${summary}. Max ${MAX_PER_HOUR} per hour` });
      return;
    }
    const r = await postOnchain({
      action: "rebalance", lower: live.lower, upper: live.upper, probInRange: live.probInRange,
      reason: `Gemini odds moved: median ${usd(rec.median)} -> ${usd(live.median)}`,
    });
    setRecorded({ lower: live.lower, upper: live.upper, median: live.median, at: now });
    setAutoTimes([...lastHour, now]);
    addLog({
      label: "Watch mode → rebalanced onchain (live odds)",
      detail: `${summary}. New range ${usd(live.lower)} – ${usd(live.upper)} · tx ${r.hash.slice(0, 10)}…`,
      url: r.url, mock: r.mock,
    });
  }

  // one poll of live Gemini data (used by the 60 s timer and "Check now")
  async function poll(manual = false) {
    try {
      const live = await getJson<CurveResp>(`/api/curve?confidence=${confidence}&shift=0`);
      addSnap(live);
      if (shift === 0) setData(live);
      if ((watch || manual) && !busy) {
        setBusy("watch");
        try { await evaluate(live, manual); } finally { setBusy(null); }
      }
    } catch (e: any) {
      addLog({ label: "Live update failed", detail: e.message });
    }
  }

  // keep the timer calling the latest version of poll (fresh state)
  const pollRef = useRef(poll);
  useEffect(() => { pollRef.current = poll; });
  useEffect(() => {
    const id = setInterval(() => pollRef.current(false), POLL_MS);
    return () => clearInterval(id);
  }, []);

  async function run(kind: "set" | "shift" | "protect", fn: () => Promise<void>) {
    setBusy(kind);
    try { await fn(); }
    catch (e: any) { addLog({ label: "Error", detail: e.message }); }
    finally { setBusy(null); }
  }

  const onSetRange = () => run("set", async () => {
    if (!data) return;
    const r = await postOnchain({
      action: "set", lower: data.lower, upper: data.upper,
      confidence: data.confidence, probInRange: data.probInRange, event: data.event,
    });
    setRecorded({ lower: data.lower, upper: data.upper, median: data.median, at: Date.now() });
    addLog({ label: "Range recorded onchain", detail: `${usd(data.lower)} – ${usd(data.upper)} · ${pct(data.probInRange)} in range · tx ${r.hash.slice(0, 10)}…`, url: r.url, mock: r.mock });
  });

  const onSimulateShift = () => run("shift", async () => {
    if (!data) return;
    setPrevCurve(data.curve);
    const d = await getJson<CurveResp>(`/api/curve?confidence=${confidence}&shift=${SHIFT}`);
    setData(d);
    setShift(SHIFT);
    const r = await postOnchain({
      action: "rebalance", lower: d.lower, upper: d.upper, probInRange: d.probInRange,
      reason: "Simulated odds shift: crowd moved $500 lower",
    });
    setRecorded({ lower: d.lower, upper: d.upper, median: d.median, at: Date.now() });
    addLog({ label: "Simulated odds shift → rebalanced onchain", detail: `New range ${usd(d.lower)} – ${usd(d.upper)} · tx ${r.hash.slice(0, 10)}…`, url: r.url, mock: r.mock });
  });

  const onProtect = () => run("protect", async () => {
    if (!data) return;
    const p = data.protection;
    const price = p.noPrice ?? 0.05;
    const order = await postProtect({ strike: p.strike, price: String(price), quantity: "1" });
    addLog({ label: "Gemini sandbox order placed", detail: `Buy NO on "BTC ≥ ${usd(p.strike)}" @ $${price.toFixed(2)} · order ${order.orderId} · ${order.symbol}`, mock: order.mock });
    const r = await postOnchain({ action: "protect", orderId: order.orderId, strike: p.strike, costCents: Math.round(price * 100) });
    addLog({ label: "Protection recorded onchain", detail: `Order ${order.orderId} · tx ${r.hash.slice(0, 10)}…`, url: r.url, mock: r.mock });
  });

  const onReset = () => { setShift(0); setPrevCurve(null); };

  const onToggleWatch = () => {
    if (!watch && shift !== 0) onReset(); // watch mode always uses live odds
    setWatch(!watch);
    addLog({ label: watch ? "Watch mode off" : "Watch mode on", detail: watch ? "" : `Checking Gemini every ${POLL_MS / 1000}s · trigger ${pct(threshold)} of range width · ≥${MIN_GAP_MS / 60_000} min apart · max ${MAX_PER_HOUR}/hour` });
  };

  // chart window: from just below the range to a bit above it
  const xMin = data ? Math.min(data.lower, data.curve[0]?.strike ?? data.lower) - 500 : 0;
  const xMax = data ? Math.min(data.curve[data.curve.length - 1]?.strike ?? data.upper, data.upper + 2500) : 1;

  return (
    <main className="min-h-screen bg-[#0B1020] text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Rangefinder</h2>
            <p className="text-sm text-slate-400">Liquidity ranges from what the market expects, not what already happened.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-teal-400/40 px-3 py-1 text-teal-300">Live Gemini data</span>
            {watch && <span className="rounded-full border border-teal-400/40 bg-teal-400/10 px-3 py-1 text-teal-300">● Watch mode on</span>}
            {USE_MOCKS && <span className="rounded-full border border-amber-400/40 px-3 py-1 text-amber-300">Onchain: mocked</span>}
            {MOCK_PROTECT && <span className="rounded-full border border-amber-400/40 px-3 py-1 text-amber-300">Gemini order: mocked</span>}
          </div>
        </header>

        {error && !data && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            Couldn&apos;t load Gemini data: {error}
            <button onClick={() => load(confidence, shift)} className="ml-3 underline">Retry</button>
          </div>
        )}

        {!data && !error && <div className="h-96 animate-pulse rounded-2xl bg-white/5" />}

        {data && (
          <>
            {/* Headline */}
            <section className="mb-6">
              <p className="mb-2 text-sm text-slate-400">
                Gemini crowd forecast · {data.title} · settles {data.expiryCentral}
              </p>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                <span className="text-teal-300">{pct(data.probInRange)}</span> chance BTC ends between{" "}
                <span className="font-mono">{usd(data.lower)}</span> and <span className="font-mono">{usd(data.upper)}</span>
              </h1>
              {data.shift !== 0 && (
                <p className="mt-3 inline-block rounded-md bg-amber-400/10 px-3 py-1 text-sm text-amber-300">
                  Simulated odds shift: crowd moved {usd(Math.abs(data.shift))} lower (demo)
                </p>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left column: curve + timeline */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                <section className="rounded-2xl border border-white/10 bg-[#121933] p-5">
                  <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
                    <span>Chance BTC finishes above each price</span>
                    {loading && <span className="text-xs">updating…</span>}
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart margin={{ top: 24, right: 20, bottom: 10, left: 0 }}>
                        <CartesianGrid stroke="#ffffff14" />
                        <XAxis
                          dataKey="strike" type="number" domain={[xMin, xMax]} allowDataOverflow
                          tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} stroke="#94a3b8" fontSize={12}
                        />
                        <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                          contentStyle={{ background: "#0B1020", border: "1px solid #334155" }}
                          labelFormatter={(v) => `BTC above ${usd(Number(v))}`}
                          formatter={(v: any) => [pct(Number(v)), "Chance"]}
                        />
                        <ReferenceArea x1={data.lower} x2={data.upper} fill="#2DD4BF" fillOpacity={0.12} />
                        <ReferenceLine x={data.median} stroke="#2DD4BF" strokeDasharray="4 4" label={{ value: "median", fill: "#2DD4BF", fontSize: 11, position: "top" }} />
                        {prevCurve && (
                          <Line data={prevCurve} dataKey="pAbove" type="monotone" stroke="#64748b" strokeDasharray="5 5" dot={false} name="Before shift" isAnimationActive={false} />
                        )}
                        <Line data={data.curve} dataKey="pAbove" type="monotone" stroke="#2DD4BF" strokeWidth={2.5} dot={{ r: 3 }} name="Now" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Slider */}
                  <div className="mt-4">
                    <label className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Target confidence</span>
                      <span className="font-mono text-teal-300">{pct(confidence)}</span>
                    </label>
                    <input
                      type="range" min={0.5} max={0.9} step={0.05} value={confidence}
                      onChange={(e) => { setConfidence(Number(e.target.value)); setSnaps([]); }}
                      className="mt-2 w-full accent-teal-400" aria-label="Target confidence"
                    />
                    {confidence > 0.8 && (
                      <p className="mt-1 text-xs text-amber-300">Above 80%, the range extends past Gemini&apos;s listed prices, so the edges are estimated.</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                    <Stat label="Crowd median" value={usd(data.median)} />
                    <Stat label="Chance below range" value={pct(data.probBelow)} />
                    <Stat label="Chance above range" value={pct(data.probAbove)} />
                    <Stat label="Protection cost" value={data.protection.noPrice !== undefined ? `$${data.protection.noPrice.toFixed(2)} / contract` : "—"} />
                  </div>
                </section>

                {/* Live odds timeline */}
                <section className="rounded-2xl border border-white/10 bg-[#121933] p-5">
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="font-semibold">Live odds timeline</h3>
                    <span className="text-xs text-slate-400">Real Gemini odds · every {POLL_MS / 1000}s · since page opened</span>
                  </div>
                  <p className="mb-3 text-xs text-slate-400">
                    Crowd median (solid) and {pct(confidence)} range (dashed). Shaded band = range currently recorded onchain.
                  </p>
                  {snaps.length < 2 ? (
                    <p className="py-10 text-center text-sm text-slate-400">
                      Collecting live data… {snaps.length} point{snaps.length === 1 ? "" : "s"} so far (a new one every {POLL_MS / 1000}s).
                    </p>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={snaps} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                          <CartesianGrid stroke="#ffffff14" />
                          <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(t) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} stroke="#94a3b8" fontSize={12} />
                          <YAxis domain={["dataMin - 300", "dataMax + 300"]} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} stroke="#94a3b8" fontSize={12} width={60} />
                          <Tooltip
                            contentStyle={{ background: "#0B1020", border: "1px solid #334155" }}
                            labelFormatter={(t) => clock(Number(t))}
                            formatter={(v: any, name: any) => [usd(Number(v)), name]}
                          />
                          {recorded && <ReferenceArea y1={recorded.lower} y2={recorded.upper} fill="#2DD4BF" fillOpacity={0.08} />}
                          <Line dataKey="upper" name="Upper" stroke="#64748b" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                          <Line dataKey="median" name="Median" stroke="#2DD4BF" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                          <Line dataKey="lower" name="Lower" stroke="#64748b" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                <ReportCard confidence={confidence} />
              </div>

              {/* Right column: actions, watch mode, log */}
              <section className="flex flex-col gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#121933] p-5">
                  <h3 className="mb-3 font-semibold">Actions</h3>
                  <div className="flex flex-col gap-2">
                    <ActionButton onClick={onSetRange} busy={busy === "set"} disabled={!!busy}>1 · Set range onchain</ActionButton>
                    <ActionButton onClick={onSimulateShift} busy={busy === "shift"} disabled={!!busy || shift !== 0 || watch}>2 · Simulate odds shift (−$500)</ActionButton>
                    <ActionButton onClick={onProtect} busy={busy === "protect"} disabled={!!busy}>3 · Protect downside (Gemini sandbox)</ActionButton>
                    {shift !== 0 && (
                      <button onClick={onReset} className="mt-1 text-xs text-slate-400 underline">Reset to live odds</button>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-slate-400">{data.protection.explain}</p>
                </div>

                {/* Watch mode */}
                <div className="rounded-2xl border border-white/10 bg-[#121933] p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Watch mode</h3>
                    <button
                      onClick={onToggleWatch}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${watch ? "bg-teal-400 text-slate-900" : "border border-white/20 text-slate-300"}`}
                      aria-pressed={watch}
                    >
                      {watch ? "On" : "Off"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Re-checks live Gemini odds every {POLL_MS / 1000}s and rebalances onchain when the crowd median moves more than the trigger.
                  </p>
                  <label className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-300">Trigger</span>
                    <select
                      value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
                      className="rounded-md border border-white/20 bg-[#0B1020] px-2 py-1 text-sm"
                    >
                      <option value={0.1}>10% of range width</option>
                      <option value={0.2}>20% of range width</option>
                      <option value={0.3}>30% of range width</option>
                    </select>
                  </label>
                  <ul className="mt-3 space-y-1 text-xs text-slate-400">
                    <li>Recorded range: {recorded ? `${usd(recorded.lower)} – ${usd(recorded.upper)} (median ${usd(recorded.median)})` : "none yet. Set range first."}</li>
                    <li>Guardrails: ≥{MIN_GAP_MS / 60_000} min between auto-rebalances · max {MAX_PER_HOUR}/hour</li>
                    <li>Auto-rebalances this hour: {autoTimes.length}/{MAX_PER_HOUR}</li>
                    {lastCheck && <li>Last check: {lastCheck}</li>}
                  </ul>
                  <button
                    onClick={() => poll(true)} disabled={!!busy}
                    className="mt-3 w-full rounded-lg border border-teal-400/50 px-3 py-2 text-sm text-teal-300 hover:bg-teal-400/10 disabled:opacity-50"
                  >
                    {busy === "watch" ? "Checking…" : "Check live odds now"}
                  </button>
                </div>

                <div className="flex-1 rounded-2xl border border-white/10 bg-[#121933] p-5">
                  <h3 className="mb-3 font-semibold">Activity</h3>
                  {log.length === 0 ? (
                    <p className="text-sm text-slate-400">No actions yet. Start with “Set range onchain”.</p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {log.map((e, i) => (
                        <li key={i} className="border-l-2 border-teal-400/50 pl-3">
                          <div className="flex justify-between gap-2">
                            <span className={e.label === "Error" ? "text-red-300" : "text-slate-100"}>{e.label}</span>
                            <span className="shrink-0 text-xs text-slate-500">{e.time}</span>
                          </div>
                          {e.detail && <div className="break-all text-xs text-slate-400">{e.detail}{e.mock && " (mock)"}</div>}
                          {e.url && (
                            <a href={e.url} target="_blank" rel="noreferrer" className="text-xs text-teal-300 underline">View transaction ↗</a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
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

function ActionButton({ children, onClick, busy, disabled }: { children: React.ReactNode; onClick: () => void; busy: boolean; disabled: boolean }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="rounded-lg bg-teal-400 px-4 py-2.5 text-left text-sm font-semibold text-slate-900 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "Working…" : children}
    </button>
  );
}