"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";

export function ScoreChart({ data }: { data: { date: string; total: number; listening: number; reading: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -10, right: 10 }}>
          <defs>
            <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 990]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="total" name="Tổng" stroke="#0891b2" strokeWidth={2.5} fill="url(#gTotal)" />
          <Area type="monotone" dataKey="listening" name="Listening" stroke="#8b5cf6" fill="none" strokeWidth={1.5} />
          <Area type="monotone" dataKey="reading" name="Reading" stroke="#f97316" fill="none" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityBars({ data }: { data: { day: string; xp: number }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="xp" name="XP" fill="#06b6d4" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
