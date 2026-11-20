/* eslint-disable @typescript-eslint/no-explicit-any */
export type Point = { strike: number; pAbove: number; symbol: string; bid?: number };

const num = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : Number(v));

export function buildCurve(contracts: any[]): Point[] {
  const pts = contracts.map((c) => {
    const strike = num(c.strike?.value ?? c.strike?.price ?? c.strike) ?? Number(String(c.label).replace(/[^0-9.]/g, ""));
    const bid = num(c.prices?.bestBid), ask = num(c.prices?.bestAsk), last = num(c.prices?.lastTradePrice);
    const p = bid !== undefined && ask !== undefined ? (bid + ask) / 2 : last ?? bid ?? ask;
    return { strike, pAbove: p ?? NaN, symbol: c.instrumentSymbol, bid };
  }).filter((p) => Number.isFinite(p.strike) && Number.isFinite(p.pAbove))
    .sort((a, b) => a.strike - b.strike);
  // probabilities must not rise as the strike rises
  for (let i = 1; i < pts.length; i++) pts[i].pAbove = Math.min(pts[i].pAbove, pts[i - 1].pAbove);
  return pts;
}

export function pAbove(curve: Point[], x: number): number {
  const n = curve.length;
  const lerp = (a: Point, b: Point) => a.pAbove + ((x - a.strike) / (b.strike - a.strike)) * (b.pAbove - a.pAbove);
  let p: number;
  if (x <= curve[0].strike) p = lerp(curve[0], curve[1]);
  else if (x >= curve[n - 1].strike) p = lerp(curve[n - 2], curve[n - 1]);
  else { const i = curve.findIndex((c) => c.strike >= x); p = lerp(curve[i - 1], curve[i]); }
  return Math.max(0, Math.min(1, p));
}

export function recommendRange(curve: Point[], confidence: number, step = 50) {
  let m = curve[0].strike;
  while (pAbove(curve, m) > 0.5 && m < curve[curve.length - 1].strike * 1.2) m += 10;
  let lower = m, upper = m;
  for (let i = 0; i < 2000 && pAbove(curve, lower) - pAbove(curve, upper) < confidence; i++) {
    lower -= step; upper += step;
  }
  const probBelow = 1 - pAbove(curve, lower), probAbove = pAbove(curve, upper);
  return { median: m, lower, upper, probInRange: 1 - probBelow - probAbove, probBelow, probAbove };
}