/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Point = { strike: number; pAbove: number; symbol: string; bid?: number };
export type CurveResp = {
  summary: string; event: string; title: string; expiry: string; expiryCentral: string;
  confidence: number; shift: number; median: number; lower: number; upper: number;
  probInRange: number; probBelow: number; probAbove: number;
  protection: { symbol: string; strike: number; noPrice?: number; explain: string };
  curve: Point[];
};
export type LogEntry = { time: string; label: string; detail: string; url?: string | null; mock?: boolean };
export type Snap = { t: number; median: number; lower: number; upper: number; probInRange: number };
export type Recorded = { lower: number; upper: number; median: number; at: number };
type Busy = null | "set" | "shift" | "protect" | "watch";

// Contract calls mocked until /api/onchain is live
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
// Gemini protection order mocked only if explicitly requested
export const MOCK_PROTECT = process.env.NEXT_PUBLIC_MOCK_PROTECT === "true";
export const SHIFT = -500;
export const POLL_MS = 60_000;          // re-check Gemini every 60 s
export const MIN_GAP_MS = 5 * 60_000;   // guardrail: ≥ 5 min between automatic rebalances
export const HEDGE_BUDGET_PER_HOUR = 1; // guardrail: bot may spend ≤ $1.00 (sandbox) on hedges per hour
export const MAX_PER_HOUR = 3;          // guardrail: ≤ 3 automatic rebalances per hour
const MAX_SNAPS = 120;

export const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
export const pct = (n: number) => Math.round(n * 100) + "%";
export const clock = (t: number = Date.now()) =>
  new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

type Ctx = {
  confidence: number; setConfidence: (n: number) => void;
  shift: number; data: CurveResp | null; prevCurve: Point[] | null;
  loading: boolean; busy: Busy; error: string | null; log: LogEntry[];
  snaps: Snap[]; recorded: Recorded | null; watch: boolean;
  threshold: number; setThreshold: (n: number) => void;
  autoTimes: number[]; lastCheck: string | null;
  autoHedge: boolean; setAutoHedge: (b: boolean) => void;
  twoSided: boolean; setTwoSided: (b: boolean) => void;
  hedgeSpent: number;
  reload: () => void; onSetRange: () => void; onSimulateShift: () => void; onProtect: () => void;
  onReset: () => void; onToggleWatch: () => void; checkNow: () => void;
};

const RangeCtx = createContext<Ctx | null>(null);

export function useRange() {
  const c = useContext(RangeCtx);
  if (!c) throw new Error("useRange must be used inside <RangeProvider>");
  return c;
}

export default function RangeProvider({ children }: { children: ReactNode }) {
  const [confidence, setConfidenceState] = useState(0.7);
  const [shift, setShift] = useState(0);
  const [data, setData] = useState<CurveResp | null>(null);
  const [prevCurve, setPrevCurve] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [recorded, setRecorded] = useState<Recorded | null>(null);
  const [watch, setWatch] = useState(false);
  const [threshold, setThreshold] = useState(0.2);
  const [autoTimes, setAutoTimes] = useState<number[]>([]);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [autoHedge, setAutoHedge] = useState(true);
  const [twoSided, setTwoSided] = useState(false);
  const [hedgeSpend, setHedgeSpend] = useState<{ t: number; cost: number }[]>([]);

  const addLog = (e: Omit<LogEntry, "time">) => setLog((l) => [{ time: clock(), ...e }, ...l]);
  const addSnap = (d: CurveResp) =>
    setSnaps((s) => [...s.slice(-(MAX_SNAPS - 1)), { t: Date.now(), median: d.median, lower: d.lower, upper: d.upper, probInRange: d.probInRange }]);

  const setConfidence = (n: number) => { setConfidenceState(n); setSnaps([]); };

  const load = useCallback(async (conf: number, sh: number) => {
    setLoading(true);
    try {
      const d = await getJson<CurveResp>(`/api/curve?confidence=${conf}&shift=${sh}`);
      setData(d);
      if (sh === 0) addSnap(d);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(confidence, shift), 250);
    return () => clearTimeout(t);
  }, [confidence, shift, load]);

  // Watch mode: compare live odds with the range recorded onchain
  async function evaluate(live: CurveResp, manual: boolean) {
    const rec = recorded;
    if (!rec) {
      if (manual) addLog({ label: "Watch check skipped", detail: "No range recorded onchain yet. Use “Set range onchain” first." });
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
    if (autoHedge) {
      try { await placeHedges(live, "auto"); }
      catch (e: any) { addLog({ label: "Auto-hedge failed", detail: e.message }); }
    }
  }

  type Leg = { side: "downside" | "upside"; outcome: "no" | "yes"; strike: number; price: number; label: string };

  // Which Gemini contracts hedge the range: NO below it (always) and, optionally, YES above it
  function hedgeLegs(d: CurveResp): Leg[] {
    const p = d.protection;
    const legs: Leg[] = [{
      side: "downside", outcome: "no", strike: p.strike, price: p.noPrice ?? 0.05,
      label: `NO on "BTC ≥ ${usd(p.strike)}" (pays if BTC finishes below it)`,
    }];
    if (twoSided && d.curve.length) {
      const up = d.curve.find((c) => c.strike >= d.upper) ?? d.curve[d.curve.length - 1];
      const strike = up.strike - d.shift;
      const price = Math.min(0.99, Math.max(0.01, Math.round((up.pAbove + 0.01) * 100) / 100));
      legs.push({ side: "upside", outcome: "yes", strike, price, label: `YES on "BTC ≥ ${usd(strike)}" (pays if BTC finishes above it)` });
    }
    return legs;
  }

  // Place hedge orders on Gemini's sandbox and record each one onchain.
  // The bot ("auto") is limited by HEDGE_BUDGET_PER_HOUR; manual clicks are not.
  async function placeHedges(d: CurveResp, source: "manual" | "auto") {
    const now = Date.now();
    const recent = hedgeSpend.filter((h) => now - h.t < 60 * 60_000);
    let spent = recent.reduce((sum, h) => sum + h.cost, 0);
    const added: { t: number; cost: number }[] = [];
    for (const leg of hedgeLegs(d)) {
      if (source === "auto" && spent + leg.price > HEDGE_BUDGET_PER_HOUR) {
        addLog({ label: "Auto-hedge blocked (budget)", detail: `${leg.label} costs $${leg.price.toFixed(2)}; bot has spent $${spent.toFixed(2)} of its $${HEDGE_BUDGET_PER_HOUR.toFixed(2)}/hour hedge budget` });
        continue;
      }
      const order = await postProtect({ strike: leg.strike, price: String(leg.price), quantity: "1", outcome: leg.outcome });
      if (source === "auto") { spent += leg.price; added.push({ t: Date.now(), cost: leg.price }); }
      addLog({ label: `${source === "auto" ? "Auto-hedge" : "Gemini sandbox order"} placed (${leg.side})`, detail: `Buy ${leg.label} @ $${leg.price.toFixed(2)} · order ${order.orderId} · ${order.symbol}`, mock: order.mock });
      const r = await postOnchain({ action: "protect", orderId: order.orderId, strike: leg.strike, costCents: Math.round(leg.price * 100) });
      addLog({ label: "Protection recorded onchain", detail: `Order ${order.orderId} · tx ${r.hash.slice(0, 10)}…`, url: r.url, mock: r.mock });
    }
    if (added.length) setHedgeSpend([...recent, ...added]);
  }

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

  // timer always calls the latest poll (fresh state), keeps running across pages
  const pollRef = useRef(poll);
  useEffect(() => { pollRef.current = poll; });
  useEffect(() => {
    const id = setInterval(() => pollRef.current(false), POLL_MS);
    return () => clearInterval(id);
  }, []);

  async function run(kind: Exclude<Busy, null | "watch">, fn: () => Promise<void>) {
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
    await placeHedges(data, "manual");
  });

  const onReset = () => { setShift(0); setPrevCurve(null); };

  const onToggleWatch = () => {
    if (!watch && shift !== 0) onReset(); // watch mode always uses live odds
    setWatch(!watch);
    addLog({
      label: watch ? "Watch mode off" : "Watch mode on",
      detail: watch ? "" : `Checking Gemini every ${POLL_MS / 1000}s · trigger ${pct(threshold)} of range width · ≥${MIN_GAP_MS / 60_000} min apart · max ${MAX_PER_HOUR}/hour`,
    });
  };

  const value: Ctx = {
    confidence, setConfidence, shift, data, prevCurve, loading, busy, error, log,
    snaps, recorded, watch, threshold, setThreshold, autoTimes, lastCheck,
    autoHedge, setAutoHedge, twoSided, setTwoSided,
    hedgeSpent: hedgeSpend.reduce((sum, h) => sum + h.cost, 0),
    reload: () => load(confidence, shift),
    onSetRange, onSimulateShift, onProtect, onReset, onToggleWatch,
    checkNow: () => poll(true),
  };

  return <RangeCtx.Provider value={value}>{children}</RangeCtx.Provider>;
}