/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildCurve, recommendRange } from "@/lib/curve";

// NOTE: no `export const dynamic` line: this Next.js version rejects it

const expiryOf = (e: any) => new Date(e.expiry ?? e.expiryDate ?? e.closeTime ?? 0).getTime();
const r2 = (n: number) => Math.round(n * 100) / 100;      // 0.705 -> 0.71
const r3 = (n: number) => Math.round(n * 1000) / 1000;    // 0.030000000000000002 -> 0.03
const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const pct = (n: number) => Math.round(n * 100) + "%";
const central = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

// Pretty-printed JSON so curl output is readable
const pretty = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json" } });

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const confidence = Number(q.get("confidence") ?? 0.7);
  const shift = Number(q.get("shift") ?? 0); // demo: simulated shift, e.g. -500

  const res = await fetch("https://api.gemini.com/v1/prediction-markets/events?status=active&category=crypto&limit=100", { cache: "no-store" });
  if (!res.ok) return pretty({ error: `Gemini returned ${res.status}` }, 502);
  const json = await res.json();
  const events: any[] = json.data ?? json;

  const now = Date.now();
  const ladders = events
    .filter((e) => String(e.ticker).startsWith("BTC") && (e.contracts?.length ?? 0) >= 4)
    .filter((e) => expiryOf(e) > now)
    .sort((a, b) => expiryOf(a) - expiryOf(b));
  // prefer a ladder with 3+ hours left (near expiry the curve is a cliff)
  const btc = ladders.find((e) => expiryOf(e) - now > 3 * 60 * 60 * 1000) ?? ladders[0];
  if (!btc) return pretty({ error: "No active BTC ladder found" }, 404);

  const curve = buildCurve(btc.contracts).map((p) => ({ ...p, strike: p.strike + shift }));
  if (curve.length < 2) return pretty({ error: "Not enough priced contracts" }, 422);
  const range = recommendRange(curve, confidence);
  // downside protection: buy NO on the ladder strike closest to (and not above) the lower bound
  const protect = [...curve].reverse().find((p) => p.strike <= range.lower) ?? curve[0];
  const expiry: string = btc.expiry ?? btc.expiryDate;

  return pretty({
    summary: `${pct(range.probInRange)} chance BTC ends between ${usd(range.lower)} and ${usd(range.upper)} at ${central(expiry)} (Gemini)` +
      (shift ? ` [simulated shift ${shift > 0 ? "+" : ""}${usd(shift).replace("$-", "-$")}]` : ""),
    event: btc.ticker,
    title: btc.title,
    expiry,
    expiryCentral: central(expiry),
    confidence,
    shift,
    median: Math.round(range.median),
    lower: Math.round(range.lower),
    upper: Math.round(range.upper),
    probInRange: r3(range.probInRange),
    probBelow: r3(range.probBelow),
    probAbove: r3(range.probAbove),
    protection: {
      symbol: protect.symbol,
      strike: protect.strike - shift,
      noPrice: protect.bid !== undefined ? r2(1 - protect.bid) : undefined,
      explain: `Buy NO on "BTC ≥ ${usd(protect.strike - shift)}": pays if BTC finishes below it`,
    },
    curve: curve.map((p) => ({ strike: p.strike, pAbove: r3(p.pAbove), symbol: p.symbol, bid: p.bid })),
  });
}

//