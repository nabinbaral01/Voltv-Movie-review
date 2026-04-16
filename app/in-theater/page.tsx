import Link from "next/link";
import Image from "next/image";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { getNowPlaying, getUpcoming } from "@/lib/tmdb";
import type { TMDBMovieBasic } from "@/lib/tmdb";

type Filter = "today" | "upcoming" | "announced";

export default async function InTheaterPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: f } = await searchParams;
  const filter: Filter = (f === "upcoming" || f === "announced") ? f : "today";

  let movies: TMDBMovieBasic[] = [];
  try {
    if (filter === "today") {
      const data = await getNowPlaying("US", 1);
      movies = data.results;
    } else if (filter === "upcoming") {
      const data = await getUpcoming("US", 1);
      movies = data.results;
    } else {
      const data = await getUpcoming("US", 2);
      movies = data.results;
    }
  } catch {}

  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const day     = now.getDate();

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6">
              <TabLink label="All"    href="/in-theater" active />
              <TabLink label="Movies" href="/in-theater" />
              <TabLink label="Shows"  href="/in-theater" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
              {/* Sidebar filters */}
              <aside className="space-y-4">
                <div className="card p-3 space-y-2">
                  <FilterItem href="/in-theater?filter=today"     label="Today"     active={filter === "today"}>
                    <Calendar weekday={weekday} day={day} />
                  </FilterItem>
                  <FilterItem href="/in-theater?filter=upcoming"  label="Upcoming"  active={filter === "upcoming"}  icon="🗓️" />
                  <FilterItem href="/in-theater?filter=announced" label="Announced" active={filter === "announced"} icon="📣" />
                </div>
                <div className="text-[10px] text-center text-[#505060] tracking-wider uppercase">
                  Advertisement
                </div>
              </aside>

              {/* Poster grid */}
              <div>
                {movies.length === 0 ? (
                  <p className="text-sm text-[#505060]">No titles found.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {movies.map((m) => (
                      <Link
                        key={m.id}
                        href={`/movie/${m.id}`}
                        className="group flex flex-col gap-2"
                      >
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1A1A28]">
                          {m.poster_path ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w500${m.poster_path}`}
                              alt={m.title}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                          )}
                        </div>
                        <div className="px-0.5">
                          <p className="text-sm font-semibold text-white leading-tight line-clamp-2 group-hover:text-[#E50914] transition-colors">
                            {m.title}
                          </p>
                          <p className="text-xs text-[#505060] mt-0.5">
                            In Theater · {m.release_date?.slice(0, 4) ?? "—"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

function TabLink({ label, href, active }: { label: string; href: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-white/10 text-white" : "text-[#A0A0B0] hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function FilterItem({
  href, label, active, icon, children,
}: {
  href: string;
  label: string;
  active?: boolean;
  icon?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
        active
          ? "bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white"
          : "text-[#A0A0B0] hover:bg-white/5 hover:text-white"
      }`}
    >
      {children ?? (
        <span className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg shrink-0">
          {icon}
        </span>
      )}
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

function Calendar({ weekday, day }: { weekday: string; day: number }) {
  return (
    <div className="w-10 h-10 rounded-lg bg-white/10 flex flex-col items-center justify-center shrink-0 leading-none">
      <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">{weekday}</span>
      <span className="text-sm font-extrabold text-white">{day}</span>
    </div>
  );
}
