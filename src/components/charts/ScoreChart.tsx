"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";

const tickStyle = { fill: "var(--ui-muted)", fontSize: 12 };
const tooltipStyle = { backgroundColor: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", color: "var(--ink)" };
const axisStyle = { stroke: "var(--line)" };

export function ScoreChart({ data }: { data: { date: string; total: number; listening: number; reading: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -10, right: 10 }}>
          <defs>
            <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ui-brand-text)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--ui-brand-text)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" tick={tickStyle} axisLine={axisStyle} tickLine={axisStyle} />
          <YAxis domain={[0, 990]} tick={tickStyle} axisLine={axisStyle} tickLine={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink)" }} itemStyle={{ color: "var(--ui-body)" }} />
          <Legend />
          <Area type="monotone" dataKey="total" name="Tổng" stroke="var(--ui-brand-text)" strokeWidth={2.5} fill="url(#gTotal)" />
          <Area type="monotone" dataKey="listening" name="Listening" stroke="var(--ui-violet-bright)" fill="none" strokeWidth={1.5} />
          <Area type="monotone" dataKey="reading" name="Reading" stroke="var(--ui-orange-bright)" fill="none" strokeWidth={1.5} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tick={{ ...tickStyle, fontSize: 11 }} axisLine={axisStyle} tickLine={axisStyle} />
          <YAxis tick={{ ...tickStyle, fontSize: 11 }} axisLine={axisStyle} tickLine={axisStyle} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--ink)" }} itemStyle={{ color: "var(--ui-body)" }} cursor={{ fill: "var(--ui-subtle)" }} />
          <Bar dataKey="xp" name="XP" fill="var(--ui-brand-text)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
