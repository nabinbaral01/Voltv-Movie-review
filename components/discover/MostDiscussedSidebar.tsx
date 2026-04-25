"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame } from "lucide-react";
import type { FireEntry } from "@/lib/fires";

export default function MostDiscussedSidebar({ initial = [] }: { initial?: FireEntry[] }) {
  const [entries, setEntries] = useState<FireEntry[]>(initial);

  useEffect(() => {
    const refetch = () => {
      fetch("/api/fires?limit=10")
        .then((r) => r.json())
        .then((d) => setEntries((d.entries ?? []).filter((e: FireEntry) => e.count > 0)))
        .catch(() => {});
    };
    const onUpdate = () => refetch();
    window.addEventListener("voltv-fires-updated", onUpdate);
    if (!initial.length) refetch();
    return () => window.removeEventListener("voltv-fires-updated", onUpdate);
  }, [initial]);

  // Only show items that have at least one fire
  const active = entries.filter((e) => e.count > 0);

  if (active.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden border border-[#1E1E2E] bg-gradient-to-b from-[#12121A] to-[#0A0A0F] p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E50914] to-[#F97316] flex items-center justify-center">
            <Flame size={14} className="fill-white text-white" />
          </div>
          <h3 className="text-sm font-bold text-white">Most Discussed</h3>
        </div>
        <p className="text-xs text-[#A0A0B0] leading-relaxed">
          Click the <Flame size={11} className="inline text-[#E50914]" /> on any poster to boost it. The most-fired items rank at the top here.
        </p>
      </div>
    );
  }

  const top3 = active.slice(0, 3);
  const rest = active.slice(3);

  return (
    <div className="rounded-2xl overflow-hidden border border-[#1E1E2E] bg-gradient-to-b from-[#12121A] to-[#0A0A0F]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1E1E2E]/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E50914] to-[#F97316] flex items-center justify-center shadow-[0_0_16px_rgba(229,9,20,0.4)]">
            <Flame size={14} className="fill-white text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">Most Discussed</h3>
            <p className="text-[10px] text-[#6B6B80] mt-0.5">Ranked by community fires</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-[#A0A0B0] bg-white/5 px-2 py-0.5 rounded-full">
          {active.length}
        </span>
      </div>

      {/* Top 3 — featured cards */}
      <div className="p-3 space-y-2">
        {top3.map((e, i) => <TopCard key={`${e.kind}:${e.tmdb_id}`} entry={e} rank={i + 1} />)}
      </div>

      {/* Rest — compact ranked list */}
      {rest.length > 0 && (
        <div className="border-t border-[#1E1E2E]/60 px-3 py-2">
          <ol className="space-y-0.5">
            {rest.map((e, i) => (
              <CompactRow key={`${e.kind}:${e.tmdb_id}`} entry={e} rank={i + 4} />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function rankStyle(rank: number) {
  if (rank === 1) return { bg: "from-[#F5A623]/25 to-[#F97316]/10", border: "border-[#F5A623]/40", text: "text-[#F5A623]" };
  if (rank === 2) return { bg: "from-[#C0C0C0]/20 to-[#A0A0B0]/10", border: "border-[#C0C0C0]/30", text: "text-[#D0D0D8]" };
  if (rank === 3) return { bg: "from-[#CD7F32]/20 to-[#8B4513]/10", border: "border-[#CD7F32]/30", text: "text-[#D2A679]" };
  return { bg: "", border: "border-[#1E1E2E]", text: "text-[#505060]" };
}

function TopCard({ entry, rank }: { entry: FireEntry; rank: number }) {
  const href = entry.kind === "tv" ? `/tv/${entry.tmdb_id}` : `/movie/${entry.tmdb_id}`;
  const s = rankStyle(rank);
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 p-2 rounded-xl border bg-gradient-to-r ${s.bg} ${s.border} hover:bg-white/[0.03] transition-colors group`}
    >
      <div className={`w-7 text-center text-base font-extrabold shrink-0 ${s.text}`}>
        {rank}
      </div>
      <div className="relative w-11 h-16 rounded-lg overflow-hidden bg-[#1A1A28] shrink-0 ring-1 ring-white/5">
        {entry.poster_url && (
          <Image src={entry.poster_url} alt={entry.title} fill sizes="44px" className="object-cover" />
        )}
        {entry.kind === "tv" && (
          <span className="absolute bottom-0.5 left-0.5 text-[8px] font-bold text-white bg-[#3B82F6] px-1 rounded-sm">TV</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">
          {entry.title}
        </div>
        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#E50914]/15 border border-[#E50914]/30">
          <Flame size={10} className="text-[#E50914] fill-[#E50914]" />
          <span className="text-[10px] font-bold text-white">
            {entry.count}
          </span>
        </div>
      </div>
    </Link>
  );
}

function CompactRow({ entry, rank }: { entry: FireEntry; rank: number }) {
  const href = entry.kind === "tv" ? `/tv/${entry.tmdb_id}` : `/movie/${entry.tmdb_id}`;
  return (
    <li>
      <Link href={href} className="flex items-center gap-2.5 py-1.5 px-1 rounded-md hover:bg-white/[0.03] transition-colors group">
        <span className="w-5 text-center text-xs font-bold text-[#505060] shrink-0">{rank}</span>
        <div className="relative w-7 h-10 rounded-md overflow-hidden bg-[#1A1A28] shrink-0">
          {entry.poster_url && (
            <Image src={entry.poster_url} alt={entry.title} fill sizes="28px" className="object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-xs font-medium text-white truncate group-hover:text-[#E50914] transition-colors">
          {entry.title}
        </div>
        <div className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-[#A0A0B0]">
          <Flame size={9} className="text-[#E50914] fill-[#E50914]" />
          {entry.count}
        </div>
      </Link>
    </li>
  );
}
