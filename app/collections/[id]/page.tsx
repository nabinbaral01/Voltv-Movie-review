import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import AddMovieButton from "@/components/collections/AddMovieButton";
import EditCollectionButton from "@/components/collections/EditCollectionButton";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { posterUrl } from "@/lib/tmdb";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const col = await prisma.collection.findUnique({ where: { id }, select: { title: true } });
  return { title: col?.title ?? "Collection" };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { id } = await params;

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      user: { select: { username: true, avatar_url: true } },
      movies: {
        orderBy: { position: "asc" },
        include: {
          movie: {
            select: {
              id: true, title: true, poster_url: true, release_date: true,
              voltv_score: true, genres: true,
            },
          },
        },
      },
    },
  });

  if (!collection) notFound();

  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const isOwner = !!authUser && (await prisma.user.findUnique({
    where: { supabase_id: authUser.id }, select: { id: true },
  }))?.id === collection.user_id;

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>
        <main className="flex-1 max-w-5xl mx-auto px-4 py-8 pb-24 lg:pb-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Link
                href={`/profile/${collection.user.username}`}
                className="flex items-center gap-2 group"
              >
                {collection.user.avatar_url ? (
                  <Image
                    src={collection.user.avatar_url}
                    alt={collection.user.username ?? ""}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#E50914] flex items-center justify-center text-xs text-white font-bold">
                    {(collection.user.username ?? "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-[#A0A0B0] group-hover:text-white transition-colors">
                  @{collection.user.username}
                </span>
              </Link>
              <span className="text-[#505060]">/</span>
              <span className="text-sm text-[#505060]">Collection</span>
            </div>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2 break-words">
                  {collection.title}
                </h1>
                {collection.description && (
                  <p className="text-[15px] text-[#A0A0B0] max-w-2xl leading-relaxed">
                    {collection.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className="text-[#A0A0B0] font-medium">
                    {collection.movies.length} {collection.movies.length === 1 ? "film" : "films"}
                  </span>
                  <span className="text-[#2A2A40]">•</span>
                  <span className={
                    collection.is_public
                      ? "px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 font-semibold"
                      : "px-2 py-0.5 rounded-full bg-[#505060]/15 text-[#A0A0B0] border border-[#505060]/20 font-semibold"
                  }>
                    {collection.is_public ? "Public" : "Private"}
                  </span>
                </div>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2 shrink-0">
                  <EditCollectionButton
                    collection={{
                      id:          collection.id,
                      title:       collection.title,
                      description: collection.description,
                      is_public:   collection.is_public,
                    }}
                  />
                  <AddMovieButton collectionId={collection.id} />
                </div>
              )}
            </div>
          </div>

          {/* Movie grid */}
          {collection.movies.length > 0 ? (
            <div className="movie-grid">
              {collection.movies.map(({ movie }, i) => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}`}
                  className="group relative"
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1A1A28]">
                    {movie.poster_url ? (
                      <Image
                        src={posterUrl(movie.poster_url.replace("https://image.tmdb.org/t/p/w500", ""), "w342")}
                        alt={movie.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl">🎬</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-xs font-mono text-white">
                      {i + 1}
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-white truncate">{movie.title}</p>
                    {movie.release_date && (
                      <p className="text-xs text-[#505060]">
                        {new Date(movie.release_date).getFullYear()}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🎬</p>
              <p className="text-[#A0A0B0]">No films in this collection yet.</p>
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
