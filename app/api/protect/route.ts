// app/api/protect/route.ts
import crypto from "crypto";

const BASE = "https://api.sandbox.gemini.com";

// Signed POST to a Gemini private REST endpoint (empty body, payload in headers)
async function geminiPrivate(path: string, fields: Record<string, unknown>) {
  const payload = { request: path, nonce: Date.now(), ...fields };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto.createHmac("sha384", process.env.GEMINI_SANDBOX_SECRET!).update(b64).digest("hex");
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
      "X-GEMINI-APIKEY": process.env.GEMINI_SANDBOX_KEY!,
      "X-GEMINI-PAYLOAD": b64,
      "X-GEMINI-SIGNATURE": signature,
    },
  });
  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text.replace(/"orderId":(\d+)/g, '"orderId":"$1"')); } catch {}
  return { ok: res.ok, status: res.status, data };
}

// Sandbox symbols differ from production: find the sandbox BTC contract closest to a strike
async function sandboxSymbolNear(strike: number) {
  const res = await fetch(`${BASE}/v1/prediction-markets/events?status=active&category=crypto&limit=100`, { cache: "no-store" });
  const json = await res.json();
  const events: any[] = json.data ?? json;
  const contracts = events
    .filter((e) => String(e.ticker).startsWith("BTC"))
    .flatMap((e) => e.contracts ?? [])
    .map((c: any) => ({ symbol: c.instrumentSymbol, strike: Number(c.strike?.value ?? c.strike ?? String(c.label).replace(/[^0-9.]/g, "")) }))
    .filter((c) => c.symbol && Number.isFinite(c.strike) && c.strike > 0);
  contracts.sort((a, b) => Math.abs(a.strike - strike) - Math.abs(b.strike - strike));
  return contracts[0]?.symbol as string | undefined;
}

export async function POST(req: Request) {
  const { symbol, strike, price = "0.10", quantity = "1", outcome = "no" } = await req.json();
  const useSymbol = symbol ?? (strike !== undefined ? await sandboxSymbolNear(Number(strike)) : undefined);
  if (!useSymbol) return Response.json({ error: "No sandbox contract found" }, { status: 404 });

  const r = await geminiPrivate("/v1/prediction-markets/order", {
    symbol: useSymbol, orderType: "limit", side: "buy", outcome,
    quantity: String(quantity), price: String(price), timeInForce: "good-til-cancel",
  });
  if (!r.ok) return Response.json({ error: r.data, status: r.status, symbol: useSymbol }, { status: 502 });
  return Response.json({ orderId: r.data.orderId, status: r.data.status, symbol: useSymbol, raw: r.data });
}
// Quick check: list my open prediction market orders
// Quick check: what happened to my prediction market orders?
export async function GET() {
  const active = await geminiPrivate("/v1/prediction-markets/orders/active", { symbol: "GEMI-BTC2611200400-HI61100" });
  const history = await geminiPrivate("/v1/prediction-markets/orders/history", { limit: 10 });
  return Response.json({ active, history });
}