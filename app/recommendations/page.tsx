import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  getCategorizedRecommendations,
  getQuickRecommendations,
  type RecommendedMovie,
  type RecSection,
} from "@/lib/recommendation-engine";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import type { TasteDNA } from "@/types";
import {
  Crown, Heart, Gem, Users, Sparkles, Flame, Brain,
  Star, Compass, Zap, TrendingUp, BarChart2,
} from "lucide-react";

export const metadata: Metadata = { title: "For You · VOLTV" };

const ICON_MAP: Record<string, React.ReactNode> = {
  crown:    <Crown size={20} />,
  heart:    <Heart size={20} />,
  gem:      <Gem size={20} />,
  users:    <Users size={20} />,
  sparkles: <Sparkles size={20} />,
  flame:    <Flame size={20} />,
  brain:    <Brain size={20} />,
  star:     <Star size={20} />,
  compass:  <Compass size={20} />,
};

export default async function RecommendationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
    select: { id: true, username: true, taste_dna: true },
  });
  if (!dbUser) redirect("/login");

  const { sections, topGenres, similarUsersCount, totalRated } =
    await getCategorizedRecommendations(dbUser.id);

  const totalMovies = new Set(sections.flatMap((s) => s.movies.map((m) => m.movie_id))).size;

  if (sections.length === 0) {
    const dna = (dbUser.taste_dna as TasteDNA | null) ?? {
      action: 50, drama: 50, horror: 50, comedy: 50,
      scifi: 50, romance: 50, thriller: 50, anime: 50,
    };
    const fallback = await getQuickRecommendations(dna, [], 48);
    if (fallback.length === 0) {
      return (
        <Shell>
          <div className="card p-8 mt-6 text-center">
            <div className="text-4xl mb-3">🎬</div>
            <h3 className="text-lg font-bold text-white">Not enough data yet</h3>
            <p className="text-sm text-[#A0A0B0] mt-1">
              Rate and watch more movies so we can learn your taste.
            </p>
            <Link href="/discover" className="btn-primary mt-4 inline-block px-6 py-2 text-sm">
              Browse movies
            </Link>
          </div>
        </Shell>
      );
    }
    sections.push({
      id: "fallback-hero", title: "Your #1 Pick",
      subtitle: fallback[0].reason,
      gradient: "from-[#E50914] to-[#8B5CF6]",
      icon: "crown", movies: fallback.slice(0, 1), layout: "hero",
    });
    sections.push({
      id: "fallback-fresh", title: "Fresh For You",
      subtitle: "Brand-new picks matched to your taste DNA",
      gradient: "from-[#3B82F6] to-[#06B6D4]",
      icon: "flame",
      movies: fallback.slice(1, 13).filter((m) => m.signals.recency >= 0.8),
      layout: "row",
    });
    sections.push({
      id: "fallback", title: "Recommended For You",
      subtitle: "Based on your taste DNA profile",
      gradient: "from-[#8B5CF6] to-[#3B82F6]",
      icon: "sparkles", movies: fallback.slice(1), layout: "grid",
    });
  }

  return (
    <Shell>
      {/* Taste Profile Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E50914]/20 via-[#0A0A0F] to-[#8B5CF6]/20 border border-[#1E1E2E] p-6 mb-8">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Your Recommendations</h1>
              <p className="text-xs text-[#A0A0B0]">AI-powered picks tuned to your taste</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <Stat icon={<Sparkles size={14} />}  label="Picks Queued"  value={totalMovies} />
            <Stat icon={<BarChart2 size={14} />} label="Movies Rated"  value={totalRated} />
            <Stat icon={<Users size={14} />}     label="Taste Twins"   value={similarUsersCount} />
            <Stat icon={<TrendingUp size={14} />} label="Signals Active" value={6} />
          </div>

          {topGenres.length > 0 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {topGenres.map((g) => (
                <span key={g.genre} className="text-xs font-medium bg-white/[0.06] border border-white/10 px-3 py-1 rounded-full text-white">
                  {g.genre} <span className="text-[#E50914] ml-1">{g.score.toFixed(1)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}

      {/* Algorithm explainer */}
      <div className="card p-6 mt-8 mb-8 space-y-4">
        <h3 className="text-lg font-bold text-white">How it works</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <AlgoChip color="#E50914" label="Collaborative Filtering" pct={30} />
          <AlgoChip color="#8B5CF6" label="Content-Based" pct={25} />
          <AlgoChip color="#3B82F6" label="ML Feature Scoring" pct={20} />
          <AlgoChip color="#22C55E" label="Deep Embedding" pct={15} />
          <AlgoChip color="#F59E0B" label="Recency Boost" pct={10} />
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>
        <main className="flex-1 min-w-0 max-w-6xl mx-auto px-4 py-6 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

function Section({ section }: { section: RecSection }) {
  const icon = ICON_MAP[section.icon] ?? <Sparkles size={20} />;

  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${section.gradient} flex items-center justify-center text-white shrink-0`}>
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{section.title}</h2>
          <p className="text-xs text-[#505060]">{section.subtitle}</p>
        </div>
      </div>

      {section.layout === "hero" && <HeroLayout movies={section.movies} />}
      {section.layout === "row" && <RowLayout movies={section.movies} />}
      {section.layout === "grid" && <GridLayout movies={section.movies} />}
      {section.layout === "spotlight" && <SpotlightLayout movies={section.movies} />}
    </div>
  );
}

function HeroLayout({ movies }: { movies: RecommendedMovie[] }) {
  const m = movies[0];
  if (!m) return null;
  return (
    <Link href={`/movie/${m.tmdb_id}`} className="group block">
      <div className="relative h-[320px] sm:h-[400px] rounded-2xl overflow-hidden bg-[#1A1A28] border border-[#1E1E2E] group-hover:border-[#E50914]/50 transition-colors">
        {m.poster_url && (
          <Image src={m.poster_url} alt={m.title} fill className="object-cover opacity-60 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={16} className="text-[#F59E0B]" />
            <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">#1 Pick For You</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{m.title}</h3>
          <p className="text-sm text-[#A0A0B0] mb-3 max-w-xl">{m.reason}</p>
          <div className="flex items-center gap-4">
            {m.voltv_score && (
              <span className="text-sm font-bold text-[#E50914]">{m.voltv_score.toFixed(1)} VOLTV</span>
            )}
            <span className="text-sm font-bold text-white bg-white/10 px-3 py-1 rounded-full">
              {Math.round(m.final_score * 100)}% match
            </span>
            <ConfidenceDot confidence={m.confidence} />
          </div>
          <div className="flex gap-3 mt-3">
            <SignalPill label="Collab" value={m.signals.collaborative} color="#E50914" />
            <SignalPill label="Content" value={m.signals.content} color="#8B5CF6" />
            <SignalPill label="Deep" value={m.signals.deep_match} color="#22C55E" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function RowLayout({ movies }: { movies: RecommendedMovie[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {movies.map((m, i) => (
        <MovieCard key={m.movie_id} movie={m} rank={i + 1} className="w-[160px] shrink-0" />
      ))}
    </div>
  );
}

function GridLayout({ movies }: { movies: RecommendedMovie[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {movies.map((m, i) => (
        <MovieCard key={m.movie_id} movie={m} rank={i + 1} />
      ))}
    </div>
  );
}

function SpotlightLayout({ movies }: { movies: RecommendedMovie[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {movies.map((m) => (
        <Link key={m.movie_id} href={`/movie/${m.tmdb_id}`} className="group">
          <div className="relative h-[200px] rounded-xl overflow-hidden bg-[#1A1A28] border border-[#1E1E2E] group-hover:border-[#E50914]/40 transition-colors">
            {m.poster_url && (
              <Image src={m.poster_url} alt={m.title} fill className="object-cover opacity-50 group-hover:opacity-60 group-hover:scale-105 transition-all duration-300" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
            <div className="absolute inset-0 p-5 flex flex-col justify-end">
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#E50914] transition-colors">{m.title}</h3>
              <p className="text-xs text-[#A0A0B0] line-clamp-2 mb-2">{m.reason}</p>
              <div className="flex items-center gap-3">
                {m.voltv_score && <span className="text-xs font-bold text-[#E50914]">{m.voltv_score.toFixed(1)}</span>}
                <span className="text-xs text-white/70">{Math.round(m.final_score * 100)}% match</span>
                <div className="flex gap-1.5 ml-auto">
                  {m.genres.slice(0, 2).map((g) => (
                    <span key={g} className="text-[9px] bg-white/[0.08] px-1.5 py-0.5 rounded text-[#A0A0B0]">{g}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function MovieCard({ movie: m, rank, className = "" }: { movie: RecommendedMovie; rank: number; className?: string }) {
  return (
    <Link href={`/movie/${m.tmdb_id}`} className={`group relative ${className}`}>
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1A1A28] border border-[#1E1E2E] group-hover:border-[#E50914]/40 transition-colors">
        {m.poster_url ? (
          <Image src={m.poster_url} alt={m.title} fill sizes="(max-width:640px) 50vw, 20vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-[#505060]">🎬</div>
        )}
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white">
          {rank}
        </div>
        <ConfidenceDot confidence={m.confidence} className="absolute top-2 right-2" />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 pt-8">
          <div className="flex items-center justify-between">
            {m.voltv_score && <span className="text-[10px] font-bold text-[#E50914]">{m.voltv_score.toFixed(1)}</span>}
            <span className="text-[9px] text-[#A0A0B0]">{Math.round(m.final_score * 100)}%</span>
          </div>
        </div>
      </div>
      <div className="mt-1.5">
        <h3 className="text-xs font-semibold text-white truncate group-hover:text-[#E50914] transition-colors">{m.title}</h3>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {m.genres.slice(0, 2).map((g) => (
            <span key={g} className="text-[8px] text-[#A0A0B0] bg-white/[0.04] px-1 py-0.5 rounded">{g}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function ConfidenceDot({ confidence, className = "" }: { confidence: string; className?: string }) {
  const color = confidence === "high" ? "bg-green-400" : confidence === "medium" ? "bg-yellow-400" : "bg-[#505060]";
  return <div className={`w-2 h-2 rounded-full ${color} ${className}`} title={`${confidence} confidence`} />;
}

function SignalPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="text-[10px] text-[#A0A0B0] flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label} {Math.round(value * 100)}
    </span>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/5 rounded-lg px-3 py-1.5">
      <span className="text-[#A0A0B0]">{icon}</span>
      <span className="text-xs text-[#A0A0B0]">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function AlgoChip({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.02] border border-[#1E1E2E] rounded-lg px-3 py-2">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-[#A0A0B0] flex-1">{label}</span>
      <span className="text-xs font-bold text-white">{pct}%</span>
    </div>
  );
}
