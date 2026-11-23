"use client";

import { useState } from "react";
import { scaleListening, scaleReading, scoreLevel } from "@/lib/toeic";

export function ScoreCalculator() {
  const [l, setL] = useState(70);
  const [r, setR] = useState(65);
  const sl = scaleListening(l);
  const sr = scaleReading(r);
  const lv = scoreLevel(sl + sr);
  return (
    <div className="card grid gap-6 p-6 md:grid-cols-[1fr_auto]">
      <div className="space-y-5">
        <h2 className="font-bold">Máy tính điểm TOEIC</h2>
        {([["Listening", l, setL, sl], ["Reading", r, setR, sr]] as const).map(([name, v, set, s]) => (
          <label key={name} className="block">
            <div className="flex justify-between text-sm"><span>{name}: <b>{v}</b>/100 câu đúng</span><b className="text-brand-600">{s}/495</b></div>
            <input type="range" min={0} max={100} value={v} onChange={(e) => set(Number(e.target.value))} className="w-full accent-cyan-500" />
          </label>
        ))}
      </div>
      <div className="grid place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-sky-700 px-10 py-6 text-center text-white">
        <div>
          <div className="text-sm text-brand-100">Tổng điểm</div>
          <div className="text-5xl font-extrabold">{sl + sr}</div>
          <div className="mt-1 text-sm">{lv.label} · {lv.cefr}</div>
        </div>
      </div>
    </div>
  );
}
