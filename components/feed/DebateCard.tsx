"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/utils/formatters";
import { posterUrl } from "@/lib/tmdb";
import Button from "@/components/ui/Button";
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

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1E1E2E]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-[#E50914] uppercase tracking-wider">
            🗳️ Daily Debate
          </span>
          <span className="text-xs text-[#505060]">{timeLeft}</span>
        </div>
        <h3 className={cn("font-bold text-white", compact ? "text-base" : "text-lg")}>
          {debate.question}
        </h3>
        {total > 0 && (
          <p className="text-xs text-[#505060] mt-1">
            {total.toLocaleString()} votes cast
          </p>
        )}
      </div>

      {/* Movie options */}
      <div className="flex">
        {/* Option A */}
        <DebateOption
          side="a"
          movie={debate.movie_a}
          label={debate.option_a}
          pct={pct_a}
          hasVoted={hasVoted}
          isChosen={optimisticVote === "a"}
          compact={compact}
          onVote={() => handleVote("a")}
        />

        {/* VS divider */}
        <div className="flex items-center justify-center px-2 shrink-0 bg-[#0A0A0F]">
          <span className="text-[#505060] font-bold text-xs font-display tracking-wider">VS</span>
        </div>

        {/* Option B */}
        <DebateOption
          side="b"
          movie={debate.movie_b}
          label={debate.option_b}
          pct={pct_b}
          hasVoted={hasVoted}
          isChosen={optimisticVote === "b"}
          compact={compact}
          onVote={() => handleVote("b")}
        />
      </div>

      {/* Progress bar (visible after voting) */}
      {hasVoted && (
        <div className="px-4 py-3 border-t border-[#1E1E2E]">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div
              className="bg-[#E50914] rounded-l-full transition-all duration-700"
              style={{ width: `${pct_a}%` }}
            />
            <div
              className="bg-[#3B82F6] rounded-r-full transition-all duration-700"
              style={{ width: `${pct_b}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[#E50914] font-mono font-bold">{pct_a}%</span>
            <span className="text-xs text-[#3B82F6] font-mono font-bold">{pct_b}%</span>
          </div>
        </div>
      )}

      {!hasVoted && (
        <div className="px-4 py-3 border-t border-[#1E1E2E]">
          <p className="text-xs text-[#505060] text-center">
            Vote to see results · +5 XP
          </p>
        </div>
      )}
    </div>
  );
}

interface DebateOptionProps {
  side: "a" | "b";
  movie: DailyDebate["movie_a"];
  label: string;
  pct: number;
  hasVoted: boolean;
  isChosen: boolean;
  compact?: boolean;
  onVote: () => void;
}

function DebateOption({
  side, movie, label, pct, hasVoted, isChosen, compact, onVote,
}: DebateOptionProps) {
  const accentColor = side === "a" ? "#E50914" : "#3B82F6";

  return (
    <button
      onClick={onVote}
      disabled={hasVoted}
      className={cn(
        "flex-1 flex flex-col items-center p-3 gap-2 transition-all duration-200",
        "relative overflow-hidden group",
        !hasVoted && "hover:bg-white/[0.03] cursor-pointer",
        isChosen && "bg-white/[0.04]"
      )}
      style={isChosen ? { boxShadow: `inset 0 0 0 1px ${accentColor}40` } : {}}
    >
      {/* Poster */}
      <div className={cn(
        "relative rounded-[8px] overflow-hidden bg-[#1A1A28]",
        compact ? "w-16 h-24" : "w-20 h-[120px]"
      )}>
        {movie.poster_url && (
          <Image
            src={posterUrl(movie.poster_url.replace("https://image.tmdb.org/t/p/w500", ""), "w185")}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="80px"
          />
        )}
        {isChosen && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
        )}
      </div>

      {/* Title */}
      <p className="text-xs font-semibold text-white text-center line-clamp-2 leading-tight">
        {movie.title}
      </p>

      {/* Label / result */}
      {hasVoted ? (
        <span
          className="text-sm font-bold font-mono"
          style={{ color: isChosen ? accentColor : "#505060" }}
        >
          {pct}%
        </span>
      ) : (
        <span className="text-xs text-[#505060] text-center line-clamp-1">{label}</span>
      )}

      {/* Chosen check */}
      {isChosen && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs"
          style={{ background: accentColor }}
        >
          ✓
        </div>
      )}
    </button>
  );
}
