/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const pct = (n: number) => Math.round(n * 100) + "%";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });

export default function ReportCard({ confidence }: { confidence: number }) {
  const [hours, setHours] = useState(6);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/history?confidence=${confidence}&hours=${hours}&days=5`);
        const j = await res.json();
        if (!res.ok || j.error) throw new Error(j.error ?? `HTTP ${res.status}`);
        if (!cancelled) { setData(j); setError(null); }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [confidence, hours]);

  const scored = (data?.days ?? []).filter((d: any) => d.result);
  const chartRows = [...scored].reverse().map((d: any) => ({ ...d, label: day(d.expiry) })); // oldest → newest
  const resultText = (r: string) => (r === "inside" ? "✓ Inside" : r === "below" ? "✗ Below" : "✗ Above");

  return (
    <section className="rounded-2xl border border-white/10 bg-[#121933] p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Crowd report card</h3>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Forecast taken
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="rounded-md border border-white/20 bg-[#0B1020] px-2 py-1">
            <option value={3}>3h</option>
            <option value={6}>6h</option>
            <option value={12}>12h</option>
          </select>
          before settlement
        </label>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        How Gemini&apos;s crowd forecast did on past days: rebuilt from real Gemini trade history, then checked against Gemini&apos;s official settlement price.
      </p>

      {loading && !data && <p className="py-8 text-center text-sm text-slate-400">Scoring past days from Gemini trade history… (first load takes ~10s)</p>}
      {error && !data && <p className="py-4 text-sm text-red-300">Couldn&apos;t load history: {error}</p>}

      {data && (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-bold">
                <span className="text-teal-300">{data.hits}/{data.daysScored}</span> days inside the crowd&apos;s {pct(data.confidence)} range
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Hit rate {pct(data.hitRate)} vs. {pct(data.confidence)} target · {data.calibration} · avg median error {usd(data.avgAbsMedianError)}
              </div>
            </div>
            {loading && <span className="text-xs text-slate-400">updating…</span>}
          </div>

          {chartRows.length >= 1 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="#ffffff14" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis domain={["dataMin - 500", "dataMax + 500"]} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} stroke="#94a3b8" fontSize={12} width={60} />
                  <Tooltip contentStyle={{ background: "#0B1020", border: "1px solid #334155" }} formatter={(v: any, name: any) => [usd(Number(v)), name]} />
                  <Line dataKey="upper" name="Range top" stroke="#64748b" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  <Line dataKey="median" name="Crowd median" stroke="#2DD4BF" strokeWidth={2} isAnimationActive={false} />
                  <Line dataKey="lower" name="Range bottom" stroke="#64748b" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  <Line
                    dataKey="settlement" name="Actual settlement" stroke="transparent" isAnimationActive={false}
                    dot={(p: any) => (
                      <circle key={`s-${p.index}`} cx={p.cx} cy={p.cy} r={6}
                        fill={p.payload.result === "inside" ? "#2DD4BF" : "#F87171"} stroke="#0B1020" strokeWidth={2} />
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Day</th>
                  <th className="py-2 pr-3">Crowd range</th>
                  <th className="py-2 pr-3">Median</th>
                  <th className="py-2 pr-3">Settled</th>
                  <th className="py-2 pr-3">Result</th>
                  <th className="py-2">Hedge</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {(data.days ?? []).map((d: any) => (
                  <tr key={d.ticker} className="border-t border-white/5">
                    <td className="py-2 pr-3 font-sans">{day(d.expiry)}</td>
                    {d.result ? (
                      <>
                        <td className="py-2 pr-3">{usd(d.lower)} – {usd(d.upper)}</td>
                        <td className="py-2 pr-3">{usd(d.median)}</td>
                        <td className="py-2 pr-3">{usd(d.settlement)}</td>
                        <td className={`py-2 pr-3 font-sans ${d.result === "inside" ? "text-teal-300" : "text-red-300"}`}>{resultText(d.result)}</td>
                        <td className="py-2 font-sans text-slate-300">{d.hedgePaid ? `Paid (NO < ${usd(d.protectStrike)})` : "—"}</td>
                      </>
                    ) : (
                      <td colSpan={5} className="py-2 font-sans text-slate-400">Settled at {usd(d.settlement)}: {d.skipped}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Method: last Gemini trade of each contract before the snapshot time → crowd curve → range at your confidence → compared with Gemini&apos;s settlementValue.
          </p>
        </>
      )}
    </section>
  );
}