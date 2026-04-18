import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import AdminLogoutButton from "../_components/AdminLogoutButton";
import DebateForm from "./_components/DebateForm";
import DeleteDebateButton from "./_components/DeleteDebateButton";
import PosterDownloadButton from "@/components/movie/PosterDownloadButton";
import { Shield, Swords, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Debates — VOLTV Admin",
  robots: { index: false, follow: false },
};

const CAT_COLORS: Record<string, string> = {
  today_release: "bg-[#E50914]/15 text-[#E50914] border-[#E50914]/30",
  anime:         "bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/30",
  classic:       "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30",
  blockbuster:   "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30",
  indie:         "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30",
  general:       "bg-white/[0.04] text-[#A0A0B0] border-[#1E1E2E]",
};

export default async function AdminDebatesPage() {
  const debates = await prisma.dailyDebate.findMany({
    orderBy: [{ debate_date: "desc" }, { created_at: "desc" }],
    take:    50,
    include: {
      movie_a: { select: { title: true, poster_url: true } },
      movie_b: { select: { title: true, poster_url: true } },
    },
  });

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <header className="sticky top-0 z-50 border-b border-[#1E1E2E] bg-[#0A0A0F]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#E50914] to-[#8B5CF6] flex items-center justify-center shadow-md shadow-[#E50914]/20">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-none">VOLTV Admin</div>
              <div className="text-[10px] text-[#505060] mt-0.5">Debates</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs text-[#A0A0B0] hover:text-white px-3 h-8 flex items-center gap-1 rounded-[8px] hover:bg-white/[0.06] transition-colors"
            >
              <ArrowLeft size={13} /> Dashboard
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Swords size={22} className="text-[#E50914]" /> Daily debates
          </h1>
          <p className="text-sm text-[#A0A0B0]">
            Create multiple debates per day across categories — today&apos;s release, anime, classics, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Create form */}
          <div className="xl:col-span-3">
            <DebateForm />
          </div>

          {/* List */}
          <div className="xl:col-span-2">
            <section className="rounded-[14px] border border-[#1E1E2E] bg-[#0E0E15] overflow-hidden">
              <header className="px-4 py-3 border-b border-[#1E1E2E] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Scheduled & past</h2>
                <span className="text-[10px] text-[#505060] font-mono">{debates.length}</span>
              </header>
              <ul className="divide-y divide-[#1E1E2E] max-h-[700px] overflow-y-auto">
                {debates.map((d) => {
                  const dateStr = d.debate_date.toISOString().slice(0, 10);
                  const category = d.category ?? "general";
                  const catClass = CAT_COLORS[category] ?? CAT_COLORS.general;
                  return (
                    <li key={d.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${catClass}`}>
                            {category.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-[#505060] font-mono">{dateStr}</span>
                        </div>
                        <DeleteDebateButton id={d.id} question={d.question} />
                      </div>
                      <p className="text-xs text-white font-medium line-clamp-2 mb-2">{d.question}</p>
                      <div className="flex items-center gap-2">
                        <MiniMovie poster={d.movie_a.poster_url} title={d.movie_a.title} label={d.option_a} votes={d.votes_a} side="a" />
                        <span className="text-[9px] text-[#505060] font-bold">VS</span>
                        <MiniMovie poster={d.movie_b.poster_url} title={d.movie_b.title} label={d.option_b} votes={d.votes_b} side="b" />
                      </div>
                    </li>
                  );
                })}
                {debates.length === 0 && (
                  <li className="px-4 py-10 text-center text-xs text-[#505060]">
                    No debates yet — create your first above.
                  </li>
                )}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function MiniMovie({
  poster, title, label, votes, side,
}: { poster: string | null; title: string; label: string; votes: number; side: "a" | "b" }) {
  return (
    <div className="flex-1 min-w-0 flex items-center gap-2 rounded-[6px] border border-[#1E1E2E] bg-white/[0.02] p-1.5">
      <div className="w-7 h-9 rounded-[4px] overflow-hidden bg-[#1E1E2E] shrink-0 relative">
        {poster && <Image src={poster} alt={title} fill sizes="28px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-white font-semibold truncate">{label || title}</div>
        <div className={`text-[9px] font-mono ${side === "a" ? "text-[#E50914]" : "text-[#8B5CF6]"}`}>
          {votes} votes
        </div>
      </div>
      {poster && <PosterDownloadButton url={poster} name={`${title}-poster`} variant="icon" />}
    </div>
  );
}
