export type Mood = "clear" | "hazy" | "stormy";

export const MOOD_COLOR: Record<Mood, string> = { clear: "#CFB991", hazy: "#E8A44C", stormy: "#EE8A7D" };
export const MOOD_TEXT: Record<Mood, string> = {
  clear: "Traders mostly agree today",
  hazy: "Traders are somewhat unsure today",
  stormy: "Traders disagree a lot today",
};

// TESTING ONLY: set to "hazy" or "stormy" to check the colors, then set back to null
const FORCE_MOOD: Mood | null = null;

type Pt = { strike: number; p: number };

// Price where P(above) = target, by linear interpolation; clamps to the nearest ladder end
function priceAt(pts: Pt[], target: number): number {
  if (target >= pts[0].p) return pts[0].strike;
  const last = pts[pts.length - 1];
  if (target <= last.p) return last.strike;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (b.p <= target) {
      if (a.p === b.p) return a.strike;
      return a.strike + ((a.p - target) / (a.p - b.p)) * (b.strike - a.strike);
    }
  }
  return last.strike;
}

// Spread = (price at 25%) − (price at 75%), as a % of the price at 50%
export function spreadPct(curve: { strike: unknown; pAbove: unknown }[] | undefined): number | null {
  if (!curve) return null;
  const pts = curve
    .map((c) => ({ strike: Number(c.strike), p: Number(c.pAbove) }))
    .filter((c) => Number.isFinite(c.strike) && Number.isFinite(c.p))
    .sort((a, b) => a.strike - b.strike);
  if (pts.length < 2) return null;
  const p50 = priceAt(pts, 0.5);
  if (!p50) return null;
  return ((priceAt(pts, 0.25) - priceAt(pts, 0.75)) / p50) * 100;
}

export function moodFor(spread: number | null): Mood {
  if (FORCE_MOOD) return FORCE_MOOD;
  if (spread === null) return "clear"; // default while loading
  return spread < 1.5 ? "clear" : spread < 3 ? "hazy" : "stormy";
}
