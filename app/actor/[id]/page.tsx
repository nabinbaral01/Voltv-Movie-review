import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getPersonDetails, profileUrl } from "@/lib/tmdb";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { Calendar, MapPin } from "lucide-react";
import Filmography, { type FilmoItem } from "./Filmography";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const person = await getPersonDetails(Number(id));
    return { title: `${person.name} · VOLTV` };
  } catch {
    return { title: "Actor · VOLTV" };
  }
}

export default async function ActorPage({ params }: Props) {
  const { id } = await params;
  const personId = Number(id);
  if (isNaN(personId)) notFound();

  let person;
  try {
    person = await getPersonDetails(personId);
  } catch {
    notFound();
  }

  const movieItems: FilmoItem[] = person.movie_credits.cast
    .filter((m) => m.poster_path)
    .map((m) => ({
      kind:         "movie",
      id:           m.id,
      title:        m.title,
      poster_path:  m.poster_path,
      date:         m.release_date ?? null,
      character:    m.character ?? null,
      vote_average: m.vote_average,
    }));
  const tvItems: FilmoItem[] = (person.tv_credits?.cast ?? [])
    .filter((t) => t.poster_path)
    .map((t) => ({
      kind:         "tv",
      id:           t.id,
      title:        t.name,
      poster_path:  t.poster_path,
      date:         t.first_air_date ?? null,
      character:    t.character ?? null,
      vote_average: t.vote_average,
    }));
  const filmography: FilmoItem[] = [...movieItems, ...tvItems].sort(
    (a, b) => (b.date ?? "").localeCompare(a.date ?? "")
  );

  const age = person.birthday ? calcAge(person.birthday, person.deathday) : null;

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 max-w-5xl mx-auto px-4 py-6 pb-24 lg:pb-8">
          {/* Profile header */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            {/* Photo */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden bg-[#1A1A28] shrink-0 border border-[#1E1E2E]">
              {person.profile_path ? (
                <Image
                  src={profileUrl(person.profile_path, "h632")}
                  alt={person.name}
                  width={160}
                  height={160}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-[#2A2A3A] flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-3/4 h-3/4 text-[#3A3A4A]">
                    <circle cx="50" cy="38" r="18" fill="currentColor" />
                    <ellipse cx="50" cy="80" rx="30" ry="22" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{person.name}</h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-[#A0A0B0] mb-3">
                {person.known_for_department && (
                  <span className="text-xs font-medium bg-[#E50914]/15 text-[#E50914] px-2.5 py-1 rounded-full">
                    {person.known_for_department}
                  </span>
                )}
                {person.birthday && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    {formatDate(person.birthday)}
                    {age !== null && ` (${age}${person.deathday ? ", died" : ""})`}
                  </span>
                )}
                {person.place_of_birth && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} />
                    {person.place_of_birth}
                  </span>
                )}
              </div>

              {/* External links */}
              <div className="flex gap-2 mb-4">
                {person.external_ids.imdb_id && (
                  <a
                    href={`https://www.imdb.com/name/${person.external_ids.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold bg-[#F5C518] text-black px-3 py-1 rounded-full hover:opacity-80 transition-opacity"
                  >
                    IMDb
                  </a>
                )}
                {person.external_ids.instagram_id && (
                  <a
                    href={`https://instagram.com/${person.external_ids.instagram_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium bg-white/[0.06] text-[#A0A0B0] px-3 py-1 rounded-full hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Biography */}
          {person.biography && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-[#A0A0B0] uppercase tracking-wide mb-3">Biography</h2>
              <p className="text-sm text-[#A0A0B0] leading-relaxed whitespace-pre-line">
                {person.biography}
              </p>
            </div>
          )}

          {/* Filmography (movies + TV with filter) */}
          {filmography.length > 0 && <Filmography items={filmography} />}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

function calcAge(birthday: string, deathday: string | null): number {
  const end = deathday ? new Date(deathday) : new Date();
  const born = new Date(birthday);
  let age = end.getFullYear() - born.getFullYear();
  const m = end.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < born.getDate())) age--;
  return age;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
