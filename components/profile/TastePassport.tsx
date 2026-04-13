"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import type { TasteDNA } from "@/types";

interface TastePassportProps {
  tasteDNA: TasteDNA;
}

const GENRE_LABELS: Record<string, string> = {
  action:   "Action",
  drama:    "Drama",
  horror:   "Horror",
  comedy:   "Comedy",
  scifi:    "Sci-Fi",
  romance:  "Romance",
  thriller: "Thriller",
  anime:    "Anime",
};

export default function TastePassport({ tasteDNA }: TastePassportProps) {
  const data = Object.entries(tasteDNA).map(([key, value]) => ({
    subject: GENRE_LABELS[key] ?? key,
    value,
    fullMark: 100,
  }));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide">
        Taste Passport
      </h3>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <PolarGrid stroke="#1E1E2E" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#505060", fontSize: 11 }}
            />
            <Radar
              name="Taste"
              dataKey="value"
              stroke="#E50914"
              fill="#E50914"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Genre bars below chart */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {Object.entries(tasteDNA)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#E50914] opacity-60 shrink-0" />
              <span className="text-xs text-[#A0A0B0] flex-1">{GENRE_LABELS[key]}</span>
              <span className="text-xs font-mono font-bold text-white">{value}%</span>
            </div>
          ))}
      </div>
    </div>
  );
}
