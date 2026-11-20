/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildCurve, recommendRange, type Point } from "@/lib/curve";

// NOTE: no `export const dynamic` line: this Next.js version rejects it

const GEMINI = "https://api.gemini.com";
const HOUR = 3_600_000;

type Day = { ticker: string; title: string; expiry: string; snapshotAt: string; settlement: number; curve: Point[] };
// Settled days never change, so cache their rebuilt curves in memory
const dayCache = new Map<string, Day>();

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const pct = (n: number) => Math.round(n * 100) + "%";
const pretty = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json" } });

// Daily BTC ladders settle at 22:00 UTC: ticker BTC{YY}{MM}{DD}2200
function tickerFor(d: Date) {
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `BTC${yy}${mm}${dd}2200`;
}

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Last traded price of a contract at or before `atMs` (Gemini public trade history)
async function lastPriceBefore(symbol: string, atMs: number) {
  const since = Math.floor((atMs - 12 * HOUR) / 1000);
  const trades: any[] = await getJson(`${GEMINI}/v1/trades/${symbol}?timestamp=${since}&limit_trades=500`);
  let best: any;
  for (const t of trades) if (t.timestampms <= atMs && (!best || t.timestampms > best.timestampms)) best = t;
  return best ? Number(best.price) : undefined;
}

// Rebuild the crowd curve for one settled day, as it looked `hoursBefore` hours before settlement
async function loadDay(ticker: string, hoursBefore: number): Promise<Day | null> {
  const key = `${ticker}|${hoursBefore}`;
  const cached = dayCache.get(key);
  if (cached) return cached;

  let e: any;
  try { e = await getJson(`${GEMINI}/v1/prediction-markets/events/${ticker}`); } catch { return null; } // no ladder that day
  e = e.data ?? e;
  if (e.status !== "settled") return null; // still trading

  const contracts: any[] = e.contracts ?? [];
  const settlement = Number(contracts.find((c) => c.settlementValue)?.settlementValue);
  const expiryMs = new Date(contracts[0]?.expiryDate ?? e.expiryDate).getTime();
  if (!Number.isFinite(settlement) || !Number.isFinite(expiryMs)) return null;
  const atMs = expiryMs - hoursBefore * HOUR;
  
  const priced: any[] = [];
  let failures = 0;
  for (let i = 0; i < contracts.length; i += 8) { // 8 requests at a time
    const chunk = contracts.slice(i, i + 8);
    const prices = await Promise.all(chunk.map((c) => lastPriceBefore(c.instrumentSymbol, atMs).catch(() => { failures++; return undefined; })));
    chunk.forEach((c, j) => {
      if (prices[j] !== undefined) {
        priced.push({ strike: c.strike, label: c.label, instrumentSymbol: c.instrumentSymbol, prices: { lastTradePrice: prices[j] } });
      }
    });
  }

  const day: Day = {
    ticker, title: e.title,
    expiry: new Date(expiryMs).toISOString(),
    snapshotAt: new Date(atMs).toISOString(),
    settlement,
    curve: buildCurve(priced),
  };
  if (failures === 0) dayCache.set(key, day); // only cache complete data, so a rate-limited fetch can retry next time
  return day;
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const confidence = Number(q.get("confidence") ?? 0.7);
  const hoursBefore = Math.min(12, Math.max(1, Number(q.get("hours") ?? 6)));
  const daysBack = Math.min(7, Math.max(1, Number(q.get("days") ?? 5)));

  const tickers = Array.from({ length: daysBack }, (_, i) => tickerFor(new Date(Date.now() - (i + 1) * 24 * HOUR)));
  const days: Day[] = [];
  for (const t of tickers) {
    try { const d = await loadDay(t, hoursBefore); if (d) days.push(d); } catch { /* skip that day */ }
  }

  const results: any[] = days.map((d) => {
    if (d.curve.length < 4) {
      return { ticker: d.ticker, title: d.title, expiry: d.expiry, settlement: Math.round(d.settlement), skipped: "Not enough trades before the snapshot time" };
    }
        const r = recommendRange(d.curve, confidence);
    // data-quality guard: thin/stale trading makes the curve jump, giving a tiny range that "holds" far more than the target
    const width = r.upper - r.lower;
    if (r.probInRange > confidence + 0.1 || width < 0.01 * r.median) {
      return {
        ticker: d.ticker, title: d.title, expiry: d.expiry, settlement: Math.round(d.settlement),
        skipped: `Not scored: crowd curve too jumpy at snapshot time (thin trading gave a $${Math.round(width).toLocaleString("en-US")}-wide range at ${Math.round(r.probInRange * 100)}%)`,
      };
    }
    const result = d.settlement < r.lower ? "below" : d.settlement > r.upper ? "above" : "inside";
    const protectStrike = ([...d.curve].reverse().find((p) => p.strike <= r.lower) ?? d.curve[0]).strike;
    return {
      ticker: d.ticker, title: d.title, expiry: d.expiry, snapshotAt: d.snapshotAt,
      settlement: Math.round(d.settlement),
      median: Math.round(r.median), lower: Math.round(r.lower), upper: Math.round(r.upper),
      probInRange: r3(r.probInRange),
      result,
      medianError: Math.round(d.settlement - r.median),
      protectStrike, hedgePaid: d.settlement < protectStrike,
      contractsUsed: d.curve.length,
    };
  });

  const scored = results.filter((r) => r.result);
  const hits = scored.filter((r) => r.result === "inside").length;
  const hitRate = scored.length ? hits / scored.length : 0;
  const avgAbsMedianError = scored.length ? Math.round(scored.reduce((s, r) => s + Math.abs(r.medianError), 0) / scored.length) : 0;
  const calibration = scored.length < 3 ? "Too few days to judge calibration yet"
    : hitRate < confidence - 0.15 ? "Crowd was overconfident recently (ranges too narrow)"
    : hitRate > confidence + 0.15 ? "Crowd was underconfident recently (ranges too wide)"
    : "Crowd was well calibrated recently";

  return pretty({
    summary: scored.length
      ? `Crowd's ${pct(confidence)} range (${hoursBefore}h before settlement) held ${hits} of ${scored.length} days (${pct(hitRate)})`
      : "No settled BTC ladders with enough trades found",
    confidence, hoursBefore, daysScored: scored.length, hits, hitRate: r3(hitRate), calibration, avgAbsMedianError,
    method: "For each past daily BTC ladder: last Gemini trade price of every contract before the snapshot time -> crowd curve -> recommended range, compared with Gemini's settlementValue.",
    days: results,
  });
}