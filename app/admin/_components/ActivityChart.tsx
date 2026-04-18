"use client";

import { useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { MessageSquare, UserPlus, TrendingUp } from "lucide-react";

export type DailyPoint = {
  date:  string;  // "Apr 12"
  iso:   string;  // "2026-04-12"
  posts: number;
  users: number;
};

type Range = 7 | 14 | 30;

export default function ActivityChart({ data }: { data: DailyPoint[] }) {
  const [range, setRange] = useState<Range>(30);
  const sliced = data.slice(-range);

  const totalPosts = sliced.reduce((s, d) => s + d.posts, 0);
  const totalUsers = sliced.reduce((s, d) => s + d.users, 0);
  const peakPosts  = sliced.reduce((m, d) => Math.max(m, d.posts), 0);
  const avgPosts   = sliced.length ? Math.round(totalPosts / sliced.length) : 0;

  return (
    <section className="rounded-[14px] border border-[#1E1E2E] bg-[#0E0E15] overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E] flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp size={14} /> Activity over time
          </h2>
          <p className="text-[10px] text-[#505060] mt-0.5">Daily posts & new users</p>
        </div>
        <div className="flex items-center gap-1 rounded-[8px] border border-[#1E1E2E] bg-white/[0.02] p-0.5">
          {([7, 14, 30] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-[6px] transition-colors ${
                range === r
                  ? "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                  : "text-[#A0A0B0] hover:text-white"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-4 divide-x divide-[#1E1E2E] border-b border-[#1E1E2E]">
        <Mini label="Posts"    value={totalPosts} icon={<MessageSquare size={11} />} tint="text-[#10B981]" />
        <Mini label="Signups"  value={totalUsers} icon={<UserPlus size={11} />}      tint="text-[#8B5CF6]" />
        <Mini label="Peak/day" value={peakPosts}  icon={<TrendingUp size={11} />}    tint="text-[#F5A623]" />
        <Mini label="Avg/day"  value={avgPosts}   icon={<TrendingUp size={11} />}    tint="text-[#3B82F6]" />
      </div>

      <div className="p-4">
        <div className="w-full h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sliced} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="postsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#10B981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1E1E2E" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#505060"
                tick={{ fontSize: 10, fill: "#A0A0B0" }}
                tickLine={false}
                axisLine={{ stroke: "#1E1E2E" }}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                stroke="#505060"
                tick={{ fontSize: 10, fill: "#A0A0B0" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "#ffffff08" }}
                contentStyle={{
                  background:  "#0A0A0F",
                  border:      "1px solid #1E1E2E",
                  borderRadius: 10,
                  fontSize:    12,
                  color:       "#fff",
                }}
                labelStyle={{ color: "#A0A0B0", fontSize: 10, marginBottom: 4 }}
                itemStyle={{ padding: 0 }}
              />
              <Bar
                dataKey="posts"
                name="Posts"
                fill="url(#postsGrad)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                type="monotone"
                dataKey="users"
                name="New users"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#8B5CF6", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-5 mt-3 text-[11px]">
          <Legend color="#10B981" label="Posts" />
          <Legend color="#8B5CF6" label="New users" />
        </div>
      </div>
    </section>
  );
}

function Mini({
  label, value, icon, tint,
}: { label: string; value: number; icon: React.ReactNode; tint: string }) {
  return (
    <div className="px-4 py-3">
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold ${tint}`}>
        {icon} {label}
      </div>
      <div className="text-lg font-bold text-white font-mono mt-0.5">{value.toLocaleString()}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#A0A0B0]">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </div>
  );
}
