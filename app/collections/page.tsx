import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { posterUrl } from "@/lib/tmdb";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Collections" };

export default async function CollectionsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/login");

  const collections = await prisma.collection.findMany({
    where: { user_id: dbUser.id },
    orderBy: { updated_at: "desc" },
    include: {
      movies: {
        take: 4,
        orderBy: { position: "asc" },
        include: {
          movie: { select: { poster_url: true, title: true } },
        },
      },
    },
  });

  // Get counts separately
  const counts = await Promise.all(
    collections.map((c) => prisma.collectionMovie.count({ where: { collection_id: c.id } }))
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>
        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 pb-24 lg:pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-4xl text-white mb-1">MY COLLECTIONS</h1>
              <p className="text-[#A0A0B0] text-sm">Curate your personal film libraries</p>
            </div>
            <Link
              href="/collections/new"
              className="btn-primary px-4 py-2 text-sm rounded-lg inline-flex items-center gap-2"
            >
              <span>+</span> New Collection
            </Link>
          </div>

          {/* Grid */}
          {collections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((col, idx) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  className="card p-0 overflow-hidden group hover:border-[#E50914]/30 transition-colors"
                >
                  {/* Poster mosaic */}
                  <div className="grid grid-cols-2 h-36 bg-[#1A1A28]">
                    {col.movies.slice(0, 4).map((item, i) => (
                      <div key={i} className="relative overflow-hidden">
                        {item.movie.poster_url ? (
                          <Image
                            src={posterUrl(item.movie.poster_url.replace("https://image.tmdb.org/t/p/w500", ""), "w185")}
                            alt={item.movie.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="150px"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#2A2A40]" />
                        )}
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - col.movies.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="bg-[#2A2A40]" />
                    ))}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate">{col.title}</h3>
                        {col.description && (
                          <p className="text-xs text-[#A0A0B0] mt-0.5 line-clamp-2">{col.description}</p>
                        )}
                      </div>
                      {col.is_public ? (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                          Public
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-[#505060]/20 text-[#505060] border border-[#505060]/20">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#505060] mt-2">
                      {counts[idx]} {counts[idx] === 1 ? "film" : "films"}
                    </p>
                  </div>
                </Link>
              ))}

              {/* New collection card */}
              <Link
                href="/collections/new"
                className="card border-dashed border-[#2A2A40] hover:border-[#E50914]/40 flex flex-col items-center justify-center gap-3 min-h-[200px] transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-[#1A1A28] flex items-center justify-center text-xl group-hover:bg-[#E50914]/10 transition-colors">
                  +
                </div>
                <span className="text-sm text-[#A0A0B0] group-hover:text-white transition-colors">
                  Create collection
                </span>
              </Link>
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🎬</p>
              <p className="text-white font-semibold mb-2">No collections yet</p>
              <p className="text-[#A0A0B0] text-sm mb-6">Start curating your first film library.</p>
              <Link
                href="/collections/new"
                className="btn-primary px-6 py-3 text-sm rounded-lg inline-block"
              >
                Create Collection
              </Link>
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
