"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/utils/formatters";
import { posterUrl } from "@/lib/tmdb";
import type { DailyDebate } from "@/types";

interface DebateCardProps {
  debate: DailyDebate;
  onVote: (choice: "a" | "b") => Promise<void>;
  compact?: boolean;
}

export default function DebateCard({ debate, onVote, compact }: DebateCardProps) {
  const [voting, setVoting] = useState(false);
  const [optimisticVote, setOptimisticVote] = useState<"a" | "b" | null>(debate.user_vote ?? null);

  const total    = debate.votes_a + debate.votes_b;
  const pct_a    = total > 0 ? Math.round((debate.votes_a / total) * 100) : 50;
  const pct_b    = 100 - pct_a;
  const hasVoted = !!optimisticVote;

  async function handleVote(choice: "a" | "b") {
    if (hasVoted || voting) return;
    setVoting(true);
    setOptimisticVote(choice);
    try {
      await onVote(choice);
    } catch {
      setOptimisticVote(null);
    } finally {
      setVoting(false);
    }
  }

  const timeLeft = (() => {
    const diff = new Date(debate.expires_at).getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m left`;
    if (m > 0) return `${m}m left`;
    return "Ended";
  })();

  const winningSide: "a" | "b" | null = !hasVoted || pct_a === pct_b ? null : pct_a > pct_b ? "a" : "b";

  const aGlow = winningSide === "a" ? "shadow-[inset_0_0_60px_-10px_rgba(229,9,20,0.55)]" : "";
  const bGlow = winningSide === "b" ? "shadow-[inset_0_0_60px_-10px_rgba(59,130,246,0.55)]" : "";

  return (
    <div
      className={cn(
        "glass-ios p-0 overflow-hidden",
        winningSide === "a" && "ring-1 ring-[#E50914]/40",
        winningSide === "b" && "ring-1 ring-[#3B82F6]/40",
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E50914] uppercase tracking-wider">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#E50914]" />
              </span>
              Live Debate
            </span>
            {total > 0 && (
              <span className="text-[10px] text-[#505060] font-mono">
                · {total.toLocaleString()} {total === 1 ? "vote" : "votes"}
              </span>
            )}
          </div>
          <h3 className={cn("font-bold text-white truncate", compact ? "text-base" : "text-lg")}>
            {debate.question}
          </h3>
        </div>
        <span className="text-[11px] text-[#A0A0B0] font-mono whitespace-nowrap shrink-0 mt-0.5">
          {timeLeft}
        </span>
      </div>

      {/* Scoreboard */}
      <div className="px-4 py-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
        {/* Side A */}
        <ScoreSide
          side="a"
          movie={debate.movie_a}
          label={debate.option_a}
          pct={pct_a}
          hasVoted={hasVoted}
          isChosen={optimisticVote === "a"}
          isWinning={winningSide === "a"}
          glow={aGlow}
          onVote={() => handleVote("a")}
          align="right"
        />

        {/* Center divider */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="glass-ios-sm w-10 h-10 !rounded-full flex items-center justify-center font-display text-xs tracking-widest text-white/80">
            VS
          </div>
          {hasVoted && (
            <span className="text-[10px] text-[#505060] font-mono">
              {Math.abs(pct_a - pct_b)}% gap
            </span>
          )}
        </div>

        {/* Side B */}
        <ScoreSide
          side="b"
          movie={debate.movie_b}
          label={debate.option_b}
          pct={pct_b}
          hasVoted={hasVoted}
          isChosen={optimisticVote === "b"}
          isWinning={winningSide === "b"}
          glow={bGlow}
          onVote={() => handleVote("b")}
          align="left"
        />
      </div>

      {/* Combined bar — shown post-vote */}
      {hasVoted && (
        <div className="px-4 pb-4">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
            <div
              className="bg-[#E50914] transition-all duration-700 ease-out"
              style={{ width: `${pct_a}%` }}
            />
            <div
              className="bg-[#3B82F6] transition-all duration-700 ease-out"
              style={{ width: `${pct_b}%` }}
            />
          </div>
        </div>
      )}

      {!hasVoted && (
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between text-[11px]">
          <span className="text-[#505060]">Tap a side to vote</span>
          <span className="text-[#F5A623] font-semibold">+5 XP</span>
        </div>
      )}
    </div>
  );
}

interface ScoreSideProps {
  side: "a" | "b";
  movie: DailyDebate["movie_a"];
  label: string;
  pct: number;
  hasVoted: boolean;
  isChosen: boolean;
  isWinning: boolean;
  glow: string;
  onVote: () => void;
  align: "left" | "right";
}

function ScoreSide({
  side, movie, label, pct, hasVoted, isChosen, isWinning, glow, onVote, align,
}: ScoreSideProps) {
  const accentColor = side === "a" ? "#E50914" : "#3B82F6";

  return (
    <button
      onClick={onVote}
      disabled={hasVoted}
      className={cn(
        "glass-ios-sm group relative flex items-center gap-3 p-2.5 transition-all duration-200 min-w-0",
        align === "right" ? "flex-row-reverse text-right" : "flex-row text-left",
        !hasVoted && "hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_28px_-10px_rgba(0,0,0,0.55)] cursor-pointer",
        glow,
      )}
      style={isChosen ? { boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 0 0 1.5px ${accentColor}99, 0 12px 28px -8px ${accentColor}55` } : {}}
    >
      {/* Poster chip */}
      <div className="relative w-24 h-[144px] sm:w-32 sm:h-[192px] shrink-0 rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/15 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)]">
        {movie.poster_url && (
          <Image
            src={posterUrl(movie.poster_url.replace("https://image.tmdb.org/t/p/w500", ""), "w342")}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 96px, 128px"
          />
        )}
        {isChosen && (
          <div
            className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold"
            style={{ background: `${accentColor}66` }}
          >
            ✓
          </div>
        )}
      </div>

      {/* Title + score column */}
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-semibold text-white leading-tight line-clamp-2">
          {movie.title}
        </p>
        {hasVoted ? (
          <p
            className={cn(
              "font-mono font-bold leading-none mt-1",
              isWinning ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
            )}
            style={{ color: isWinning ? accentColor : "#A0A0B0" }}
          >
            {pct}%
          </p>
        ) : (
          <p className="text-[11px] text-[#505060] line-clamp-1 mt-0.5">{label}</p>
        )}
      </div>
    </button>
  );
}
