/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildCurve, recommendRange } from "@/lib/curve";

// NOTE: no `export const dynamic` line: this Next.js version rejects it

const GEMINI = "https://api.gemini.com";
const HOUR = 3_600_000;
const STALE_MS = 12 * HOUR; // ignore trades older than 12h at each snapshot

type Trade = { t: number; price: number };
type DayData = {
  ticker: string; title: string; expiryMs: number; startMs: number; settlement: number;
  contracts: { strike: any; label: string; instrumentSymbol: string; trades: Trade[] }[];
};
const cache = new Map<string, DayData>(); // settled days never change

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const pct = (n: number) => Math.round(n * 100) + "%";
const pretty = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json" } });

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

// Load a settled ladder plus every contract's trade history (fetched once per contract)
async function loadDay(ticker: string): Promise<DayData | { error: string }> {
  const hit = cache.get(ticker);
  if (hit) return hit;

  let e: any;
  try { e = await getJson(`${GEMINI}/v1/prediction-markets/events/${ticker}`); }
  catch { return { error: `No Gemini ladder found for ${ticker}` }; }
  e = e.data ?? e;
  if (e.status !== "settled") return { error: `${ticker} has not settled yet` };

  const raw: any[] = e.contracts ?? [];
  const settlement = Number(raw.find((c) => c.settlementValue)?.settlementValue);
  const expiryMs = new Date(raw[0]?.expiryDate ?? e.expiryDate).getTime();
  if (!Number.isFinite(settlement) || !Number.isFinite(expiryMs)) return { error: "Missing settlement data" };
  const listed = raw.map((c) => new Date(c.effectiveDate ?? c.createdAt ?? 0).getTime()).filter((n) => Number.isFinite(n) && n > 0);
  const startMs = Math.max(listed.length ? Math.min(...listed) : 0, expiryMs - 24 * HOUR);

  const contracts: DayData["contracts"] = [];
  let failures = 0;
  for (let i = 0; i < raw.length; i += 8) { // 8 requests at a time
    const chunk = raw.slice(i, i + 8);
    const results = await Promise.all(chunk.map(async (c) => {
      try {
        const trades: any[] = await getJson(`${GEMINI}/v1/trades/${c.instrumentSymbol}?timestamp=${Math.floor((startMs - STALE_MS) / 1000)}&limit_trades=500`);
        return trades
          .map((t) => ({ t: Number(t.timestampms), price: Number(t.price) }))
          .filter((t) => Number.isFinite(t.t) && Number.isFinite(t.price))
          .sort((a, b) => a.t - b.t);
      } catch { failures++; return null; }
    }));
    chunk.forEach((c, j) => {
      const tr = results[j];
      if (tr) contracts.push({ strike: c.strike, label: c.label, instrumentSymbol: c.instrumentSymbol, trades: tr });
    });
  }

  const day: DayData = { ticker, title: e.title, expiryMs, startMs, settlement, contracts };
  if (failures === 0) cache.set(ticker, day); // only cache complete data
  return day;
}

// Last trade price at or before `at`, ignoring trades older than STALE_MS
function priceAt(trades: Trade[], at: number) {
  let p: number | undefined;
  for (const tr of trades) {
    if (tr.t > at) break;
    if (tr.t >= at - STALE_MS) p = tr.price;
  }
  return p;
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const confidence = Number(q.get("confidence") ?? 0.7);
  const available = Array.from({ length: 5 }, (_, i) => tickerFor(new Date(Date.now() - (i + 1) * 24 * HOUR)));
  const ticker = q.get("ticker") ?? available[0];
  if (!/^BTC\d{10}$/.test(ticker)) return pretty({ error: "Invalid ticker", available }, 400);

  const day = await loadDay(ticker);
  if ("error" in day) return pretty({ error: day.error, available }, 404);

  const points: any[] = [];
  for (let t = day.startMs + HOUR; t <= day.expiryMs; t += HOUR) {
    const at = Math.min(t, day.expiryMs - 1);
    const priced = day.contracts
      .map((c) => {
        const p = priceAt(c.trades, at);
        return p === undefined ? null : { strike: c.strike, label: c.label, instrumentSymbol: c.instrumentSymbol, prices: { lastTradePrice: p } };
      })
      .filter(Boolean);
    const curve = buildCurve(priced as any[]);
    if (curve.length < 4) continue;
    const r = recommendRange(curve, confidence);
    const width = r.upper - r.lower;
    if (r.probInRange > confidence + 0.1 || width < 0.01 * r.median) continue; // jumpy curve: skip this hour
    points.push({
      t,
      hoursToClose: Math.round((day.expiryMs - t) / HOUR),
      median: Math.round(r.median),
      lower: Math.round(r.lower),
      upper: Math.round(r.upper),
      inside: day.settlement >= r.lower && day.settlement <= r.upper,
    });
  }

  const first = points[0], last = points[points.length - 1];
  const insideHours = points.filter((p) => p.inside).length;
  return pretty({
    summary: points.length
      ? `${day.title}: crowd median moved from ${usd(first.median)} (${first.hoursToClose}h before close) to ${usd(last.median)} (${last.hoursToClose}h before); BTC settled at ${usd(day.settlement)}, inside the crowd's ${pct(confidence)} range in ${insideHours} of ${points.length} hourly snapshots.`
      : "Not enough trading to replay this day",
    ticker, title: day.title,
    expiry: new Date(day.expiryMs).toISOString(),
    settlement: Math.round(day.settlement),
    confidence, available,
    insideHours, snapshots: points.length,
    firstError: first ? Math.round(day.settlement - first.median) : null,
    lastError: last ? Math.round(day.settlement - last.median) : null,
    contractsWithTrades: day.contracts.length,
    method: "Each hour: last Gemini trade (within 12h) of every contract -> crowd curve -> range at your confidence, compared with Gemini's settlementValue.",
    points,
  });
}
