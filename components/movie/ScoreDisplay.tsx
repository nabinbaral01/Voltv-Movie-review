import { cn, formatScore } from "@/utils/formatters";

interface ScoreRowProps {
  voltv_score: number | null;
  imdb_rating: number | null;
  rt_score: number | null;
  total_ratings?: number;
}

export default function ScoreDisplay({
  voltv_score,
  imdb_rating,
  rt_score,
  total_ratings,
}: ScoreRowProps) {
  return (
    <div className="flex items-stretch gap-3 flex-wrap">
      {/* VOLTV Score */}
      <ScoreBlock
        label="VOLTV"
        prefix="⚡"
        score={voltv_score !== null ? formatScore(voltv_score) : "—"}
        subtext={total_ratings ? `${total_ratings.toLocaleString()} ratings` : "No ratings yet"}
        highlight
      />

      {/* IMDb */}
      {imdb_rating !== null && (
        <ScoreBlock
          label="IMDb"
          prefix="⭐"
          score={formatScore(imdb_rating)}
          subtext="IMDb rating"
        />
      )}

      {/* Rotten Tomatoes */}
      {rt_score !== null && (
        <ScoreBlock
          label="RT"
          prefix={rt_score >= 60 ? "🍅" : "💩"}
          score={`${rt_score}%`}
          subtext="Tomatometer"
        />
      )}
    </div>
  );
}

interface ScoreBlockProps {
  label: string;
  prefix: string;
  score: string;
  subtext: string;
  highlight?: boolean;
}

function ScoreBlock({ label, prefix, score, subtext, highlight }: ScoreBlockProps) {
  return (
    <div
      className={cn(
        "flex-1 min-w-[100px] rounded-[10px] p-3 border text-center",
        highlight
          ? "bg-[#E50914]/10 border-[#E50914]/30"
          : "bg-[#1A1A28] border-white/[0.06]"
      )}
    >
      <div className="text-xs font-semibold text-[#505060] uppercase tracking-wider mb-1">
        {prefix} {label}
      </div>
      <div className={cn(
        "text-2xl font-bold font-mono",
        highlight ? "text-[#F5A623]" : "text-white"
      )}>
        {score}
      </div>
      <div className="text-[11px] text-[#505060] mt-0.5">{subtext}</div>
    </div>
  );
}
