/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer } from "recharts";

const ACCENT = "#A78BFA", MUTED = "#6B6480", GOLD = "#CFB991", MISS = "#F87171", AXIS = "#9CA3AF";
const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const signedUsd = (n: number) => (n >= 0 ? "+" : "−") + usd(Math.abs(n));
const hourCT = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", timeZone: "America/Chicago" });
const dayLabel = (ticker: string) => {
  const y = 2000 + Number(ticker.slice(3, 5)), m = Number(ticker.slice(5, 7)), d = Number(ticker.slice(7, 9));
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

export default function ReplayCard({ confidence }: { confidence: number }) {
  const [ticker, setTicker] = useState<string | null>(null); // null = yesterday (server default)
  const [available, setAvailable] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/replay?confidence=${confidence}${ticker ? `&ticker=${ticker}` : ""}`);
        const j = await res.json();
        if (j.available && !cancelled) setAvailable(j.available);
        if (!res.ok || j.error) throw new Error(j.error ?? `HTTP ${res.status}`);
        if (!cancelled) { setData(j); setError(null); }
      } catch (e: any) {
        if (!cancelled) { setError(e.message); setData(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [confidence, ticker]);

  const points: any[] = data?.points ?? [];
  const values = points.flatMap((p) => [p.lower, p.upper]).concat(data ? [data.settlement] : []);
  const yMin = values.length ? Math.min(...values) - 300 : 0;
  const yMax = values.length ? Math.max(...values) + 300 : 1;
  const active = ticker ?? data?.ticker ?? available[0];

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151022] p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Replay a past day</h3>
        <div className="flex flex-wrap gap-1">
          {available.map((tk) => (
            <button
              key={tk} onClick={() => setTicker(tk)}
              className={`rounded-md px-2.5 py-1 text-xs ${tk === active ? "bg-violet-500/25 text-violet-200" : "border border-white/15 text-slate-400 hover:text-slate-100"}`}
            >
              {dayLabel(tk)}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Watch the crowd&apos;s forecast evolve hour by hour on a settled day, rebuilt from real Gemini trade history. The gold line is where BTC actually settled.
      </p>

      {loading && !data && <p className="py-8 text-center text-sm text-slate-400">Rebuilding the day from Gemini trade history… (first load ~10s)</p>}
      {error && !loading && <p className="py-4 text-sm text-red-300">Couldn&apos;t replay this day: {error}</p>}

      {data && (
        <>
          <p className="mb-4 text-sm text-slate-300">{data.summary}{loading && <span className="ml-2 text-xs text-slate-400">updating…</span>}</p>

          {points.length >= 2 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 16, right: 24, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="#ffffff14" />
                  <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={hourCT} stroke={AXIS} fontSize={12} />
                  <YAxis domain={[yMin, yMax]} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} stroke={AXIS} fontSize={12} width={60} />
                  <Tooltip
                    contentStyle={{ background: "#0A0710", border: "1px solid #3b2f5c" }}
                    labelFormatter={(t: any) => {
                      const p = points.find((x) => x.t === t);
                      return `${hourCT(Number(t))} CT${p ? ` · ${p.hoursToClose}h before close` : ""}`;
                    }}
                    formatter={(v: any, name: any) => [usd(Number(v)), name]}
                  />
                  <ReferenceLine y={data.settlement} stroke={GOLD} strokeDasharray="6 4" label={{ value: `Settled ${usd(data.settlement)}`, fill: GOLD, fontSize: 11, position: "insideTopRight" }} />
                  <Line dataKey="upper" name="Range top" stroke={MUTED} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  <Line
                    dataKey="median" name="Crowd median" stroke={ACCENT} strokeWidth={2} isAnimationActive={false}
                    dot={(p: any) => (
                      <circle key={`m-${p.index}`} cx={p.cx} cy={p.cy} r={3.5} fill={p.payload.inside ? ACCENT : MISS} stroke="#0A0710" strokeWidth={1} />
                    )}
                  />
                  <Line dataKey="lower" name="Range bottom" stroke={MUTED} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {points.length >= 1 && (
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-xs text-slate-400">Earliest snapshot ({points[0].hoursToClose}h before close)</div>
                <div className="mt-1 font-mono">{usd(points[0].median)} <span className="text-xs text-slate-400">({signedUsd(data.firstError)} vs settle)</span></div>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-xs text-slate-400">Last snapshot ({points[points.length - 1].hoursToClose}h before close)</div>
                <div className="mt-1 font-mono">{usd(points[points.length - 1].median)} <span className="text-xs text-slate-400">({signedUsd(data.lastError)} vs settle)</span></div>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-xs text-slate-400">Hours settlement was inside the range</div>
                <div className="mt-1 font-mono">{data.insideHours} / {data.snapshots}</div>
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Purple dot = the settlement price was inside that hour&apos;s range · red dot = outside. Method: each hour, the last Gemini trade (within 12h) of every contract → curve → range; hours with too little trading are skipped.
          </p>
        </>
      )}
    </section>
  );
}
