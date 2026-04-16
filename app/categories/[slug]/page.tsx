import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";
import { discoverMovies, getTopRated, GENRE_MAP } from "@/lib/tmdb";
import type { TMDBMovieBasic } from "@/lib/tmdb";

type Slug = "genre" | "country" | "language" | "family-friendly"
          | "award-winners" | "voltv-select" | "anime" | "franchise" | "all";

const TITLES: Record<Slug, string> = {
  genre: "Genres",
  country: "Countries",
  language: "Languages",
  "family-friendly": "Family Friendly",
  "award-winners": "Award Winners",
  "voltv-select": "VoltV Select",
  anime: "Anime",
  franchise: "Franchise",
  all: "All Categories",
};

// ─── Genre tiles (colored gradients) ────────────────────────────────
const GENRE_TILES: { id: string; name: string; gradient: string }[] = [
  { id: "28",    name: "Action",        gradient: "from-[#B91C1C] to-[#E11D48]" },
  { id: "12",    name: "Adventure",     gradient: "from-[#059669] to-[#10B981]" },
  { id: "16",    name: "Animated",      gradient: "from-[#7C3AED] to-[#A855F7]" },
  { id: "35",    name: "Comedy",        gradient: "from-[#CA8A04] to-[#A3A300]" },
  { id: "80",    name: "Crime",         gradient: "from-[#1F2937] to-[#374151]" },
  { id: "99",    name: "Documentary",   gradient: "from-[#475569] to-[#64748B]" },
  { id: "18",    name: "Drama",         gradient: "from-[#334155] to-[#475569]" },
  { id: "10751", name: "Family",        gradient: "from-[#0EA5E9] to-[#2563EB]" },
  { id: "14",    name: "Fantasy",       gradient: "from-[#6D28D9] to-[#DB2777]" },
  { id: "36",    name: "History",       gradient: "from-[#78350F] to-[#B45309]" },
  { id: "27",    name: "Horror",        gradient: "from-[#000000] to-[#1F1F1F]" },
  { id: "10402", name: "Music",         gradient: "from-[#C026D3] to-[#DB2777]" },
  { id: "9648",  name: "Mystery",       gradient: "from-[#581C87] to-[#7E22CE]" },
  { id: "10749", name: "Romance",       gradient: "from-[#9F1239] to-[#BE123C]" },
  { id: "878",   name: "Sci-Fi",        gradient: "from-[#0F766E] to-[#0891B2]" },
  { id: "10770", name: "TV Movie",      gradient: "from-[#374151] to-[#1F2937]" },
  { id: "53",    name: "Thriller",      gradient: "from-[#0B1120] to-[#1E293B]" },
  { id: "10752", name: "War",           gradient: "from-[#3F3F46] to-[#52525B]" },
  { id: "37",    name: "Western",       gradient: "from-[#92400E] to-[#B45309]" },
];

// ─── Country tiles ──────────────────────────────────────────────────
const COUNTRIES: { code: string; label: string; flag: string }[] = [
  { code: "AR", label: "Argentina",    flag: "🇦🇷" },
  { code: "AU", label: "Australia",    flag: "🇦🇺" },
  { code: "AT", label: "Austria",      flag: "🇦🇹" },
  { code: "BE", label: "Belgium",      flag: "🇧🇪" },
  { code: "BR", label: "Brazil",       flag: "🇧🇷" },
  { code: "CA", label: "Canada",       flag: "🇨🇦" },
  { code: "CN", label: "China",        flag: "🇨🇳" },
  { code: "CO", label: "Colombia",     flag: "🇨🇴" },
  { code: "DK", label: "Denmark",      flag: "🇩🇰" },
  { code: "FI", label: "Finland",      flag: "🇫🇮" },
  { code: "FR", label: "France",       flag: "🇫🇷" },
  { code: "DE", label: "Germany",      flag: "🇩🇪" },
  { code: "GR", label: "Greece",       flag: "🇬🇷" },
  { code: "HK", label: "Hong Kong",    flag: "🇭🇰" },
  { code: "HU", label: "Hungary",      flag: "🇭🇺" },
  { code: "IN", label: "India",        flag: "🇮🇳" },
  { code: "ID", label: "Indonesia",    flag: "🇮🇩" },
  { code: "IE", label: "Ireland",      flag: "🇮🇪" },
  { code: "IT", label: "Italy",        flag: "🇮🇹" },
  { code: "JP", label: "Japan",        flag: "🇯🇵" },
  { code: "KR", label: "South Korea",  flag: "🇰🇷" },
  { code: "MX", label: "Mexico",       flag: "🇲🇽" },
  { code: "NL", label: "Netherlands",  flag: "🇳🇱" },
  { code: "NZ", label: "New Zealand",  flag: "🇳🇿" },
  { code: "NO", label: "Norway",       flag: "🇳🇴" },
  { code: "PH", label: "Philippines",  flag: "🇵🇭" },
  { code: "PL", label: "Poland",       flag: "🇵🇱" },
  { code: "RU", label: "Russia",       flag: "🇷🇺" },
  { code: "ES", label: "Spain",        flag: "🇪🇸" },
  { code: "SE", label: "Sweden",       flag: "🇸🇪" },
  { code: "CH", label: "Switzerland",  flag: "🇨🇭" },
  { code: "TH", label: "Thailand",     flag: "🇹🇭" },
  { code: "TR", label: "Turkey",       flag: "🇹🇷" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { code: "US", label: "United States", flag: "🇺🇸" },
];

// ─── Language tiles ─────────────────────────────────────────────────
const LANGUAGES: { code: string; label: string }[] = [
  { code: "sq", label: "Albanian" },
  { code: "ar", label: "Arabic" },
  { code: "bn", label: "Bengali" },
  { code: "ca", label: "Catalan" },
  { code: "zh", label: "Chinese" },
  { code: "da", label: "Danish" },
  { code: "nl", label: "Dutch" },
  { code: "en", label: "English" },
  { code: "fi", label: "Finnish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "el", label: "Greek" },
  { code: "gu", label: "Gujarati" },
  { code: "hi", label: "Hindi" },
  { code: "hu", label: "Hungarian" },
  { code: "id", label: "Indonesian" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "kn", label: "Kannada" },
  { code: "ko", label: "Korean" },
  { code: "ml", label: "Malayalam" },
  { code: "mr", label: "Marathi" },
  { code: "no", label: "Norwegian" },
  { code: "fa", label: "Persian" },
  { code: "pl", label: "Polish" },
  { code: "pt", label: "Portuguese" },
  { code: "pa", label: "Punjabi" },
  { code: "ru", label: "Russian" },
  { code: "es", label: "Spanish" },
  { code: "sv", label: "Swedish" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "th", label: "Thai" },
  { code: "tr", label: "Turkish" },
  { code: "vi", label: "Vietnamese" },
];

const TOOLBAR_FILTERS = [
  { value: "all",        label: "All" },
  { value: "movies",     label: "Movies" },
  { value: "series",     label: "Series" },
  { value: "anime",      label: "Show Anime" },
  { value: "select",     label: "VoltV Select",    tone: "yellow" as const },
  { value: "family",     label: "Family Friendly", tone: "blue"   as const },
  { value: "newest",     label: "Newest" },
  { value: "ott",        label: "OTT Channel" },
];

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string; f?: string }>;
}) {
  const { slug: raw } = await params;
  const { v, f } = await searchParams;
  const slug = raw as Slug;
  if (!(slug in TITLES)) notFound();

  // Tile-picker pages (no `v` selected yet)
  if (!v && (slug === "genre" || slug === "country" || slug === "language" || slug === "franchise" || slug === "voltv-select")) {
    return (
      <Shell slug={slug}>
        {slug === "genre"    && <GenreTiles />}
        {slug === "country"  && <CountryTiles />}
        {slug === "language" && <LanguageTiles />}
        {slug === "franchise" && <FranchiseTiles />}
        {slug === "voltv-select" && <VoltVSelectTiles />}
      </Shell>
    );
  }

  let movies: TMDBMovieBasic[] = [];
  try {
    movies = await fetchMoviesFor(slug, v ?? null);
  } catch {}

  const showToolbar = ["family-friendly", "award-winners", "anime", "all"].includes(slug);
  const activeFilter = f ?? "all";

  return (
    <Shell slug={slug} showBack={slug === "genre" || slug === "country" || slug === "language" || slug === "franchise" || slug === "voltv-select"}>
      {/* Selected chip label */}
      {v && (
        <div className="text-sm text-[#A0A0B0]">
          Showing: <span className="text-white font-semibold">{labelForSelection(slug, v)}</span>
        </div>
      )}

      {showToolbar && (
        <FilterToolbar slug={slug} active={activeFilter} />
      )}

      {movies.length === 0 ? (
        <p className="text-sm text-[#505060]">No titles found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((m) => (
            <Link key={m.id} href={`/movie/${m.id}`} className="group flex flex-col gap-2">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1A1A28]">
                {m.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${m.poster_path}`}
                    alt={m.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight line-clamp-2 group-hover:text-[#E50914] transition-colors">
                  {m.title}
                </p>
                <p className="text-xs text-[#505060] mt-0.5">
                  {m.release_date?.slice(0, 4) ?? "—"}
                  {typeof m.vote_average === "number" && <> · ⭐ {m.vote_average.toFixed(1)}</>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}

// ─── Shell ──────────────────────────────────────────────────────────
function Shell({ slug, showBack, children }: { slug: Slug; showBack?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Link href="/categories" className="text-sm text-[#A0A0B0] hover:text-white transition-colors">
                  ← Categories
                </Link>
                <span className="text-[#505060]">/</span>
                <h1 className="text-2xl font-bold text-white">{TITLES[slug]}</h1>
                {showBack && (
                  <Link
                    href={`/categories/${slug}`}
                    className="ml-2 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#A0A0B0] hover:text-white"
                  >
                    Change
                  </Link>
                )}
              </div>
              <input
                type="search"
                placeholder={`Search ${TITLES[slug].toLowerCase()}`}
                className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-[#505060] focus:border-white/30 outline-none w-full sm:w-72"
              />
            </div>
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

// ─── Tile pickers ──────────────────────────────────────────────────
function GenreTiles() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {GENRE_TILES.map((g) => (
        <Link
          key={g.id}
          href={`/categories/genre?v=${g.id}`}
          className={`relative h-28 sm:h-32 rounded-2xl overflow-hidden bg-gradient-to-br ${g.gradient} flex items-end p-4 group hover:scale-[1.02] transition-transform shadow-lg`}
        >
          <span className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {g.name}
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </Link>
      ))}
    </div>
  );
}

function CountryTiles() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {COUNTRIES.map((c) => (
        <Link
          key={c.code}
          href={`/categories/country?v=${c.code}`}
          className="card p-4 flex items-center gap-3 hover:border-white/20 hover:bg-white/[0.04] transition-all"
        >
          <span className="text-3xl leading-none">{c.flag}</span>
          <span className="text-sm font-semibold text-white truncate">{c.label}</span>
        </Link>
      ))}
    </div>
  );
}

function LanguageTiles() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {LANGUAGES.map((l) => (
        <Link
          key={l.code}
          href={`/categories/language?v=${l.code}`}
          className="card p-4 flex items-center gap-3 hover:border-white/20 hover:bg-white/[0.04] transition-all"
        >
          <span className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-extrabold text-white uppercase shrink-0">
            {l.code.slice(0, 2)}
          </span>
          <span className="text-sm font-semibold text-white truncate">{l.label}</span>
        </Link>
      ))}
    </div>
  );
}

function FranchiseTiles() {
  const items = [
    { id: "1241",  label: "Harry Potter",  gradient: "from-[#7C2D12] to-[#B45309]" },
    { id: "10",    label: "Star Wars",     gradient: "from-[#0B1120] to-[#1E293B]" },
    { id: "86311", label: "Marvel (MCU)",  gradient: "from-[#B91C1C] to-[#E11D48]" },
    { id: "645",   label: "James Bond",    gradient: "from-[#1F2937] to-[#374151]" },
    { id: "8091",  label: "Jurassic Park", gradient: "from-[#065F46] to-[#047857]" },
    { id: "119",   label: "Lord of the Rings", gradient: "from-[#44403C] to-[#78716C]" },
    { id: "87359", label: "Mission: Impossible", gradient: "from-[#7F1D1D] to-[#991B1B]" },
    { id: "295",   label: "Pirates of the Caribbean", gradient: "from-[#0F172A] to-[#1E40AF]" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((f) => (
        <Link
          key={f.id}
          href={`/categories/franchise?v=${f.id}`}
          className={`relative h-28 sm:h-32 rounded-2xl overflow-hidden bg-gradient-to-br ${f.gradient} flex items-end p-4 hover:scale-[1.02] transition-transform shadow-lg`}
        >
          <span className="text-lg sm:text-xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {f.label}
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </Link>
      ))}
    </div>
  );
}

function VoltVSelectTiles() {
  const items = [
    { id: "top",      label: "Top Rated",    gradient: "from-[#CA8A04] to-[#F59E0B]" },
    { id: "popular",  label: "Most Popular", gradient: "from-[#B91C1C] to-[#E11D48]" },
    { id: "trending", label: "Trending",     gradient: "from-[#7C3AED] to-[#A855F7]" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((f) => (
        <Link
          key={f.id}
          href={`/categories/voltv-select?v=${f.id}`}
          className={`relative h-28 sm:h-32 rounded-2xl overflow-hidden bg-gradient-to-br ${f.gradient} flex items-end p-4 hover:scale-[1.02] transition-transform shadow-lg`}
        >
          <span className="text-xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {f.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ─── Filter toolbar ─────────────────────────────────────────────────
function FilterToolbar({ slug, active }: { slug: Slug; active: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
      {TOOLBAR_FILTERS.map((f) => {
        const isActive = active === f.value;
        const toneClasses =
          f.tone === "yellow" ? "bg-[#F5A623] text-black border-transparent" :
          f.tone === "blue"   ? "bg-[#3B82F6] text-white border-transparent" :
          isActive             ? "bg-white text-black border-transparent" :
                                 "bg-white/5 text-[#A0A0B0] hover:text-white border-white/10";
        return (
          <Link
            key={f.value}
            href={`/categories/${slug}?f=${f.value}`}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${toneClasses}`}
          >
            {f.label}
          </Link>
        );
      })}
      <div className="ml-auto hidden md:flex items-center justify-center w-48 h-10 rounded-md border border-dashed border-white/10 text-[10px] uppercase tracking-widest text-[#505060]">
        Advertisement
      </div>
    </div>
  );
}

// ─── Data fetch ─────────────────────────────────────────────────────
async function fetchMoviesFor(slug: Slug, selected: string | null): Promise<TMDBMovieBasic[]> {
  switch (slug) {
    case "genre": {
      const d = await discoverMovies({ with_genres: selected ?? "28", sort_by: "popularity.desc" });
      return d.results;
    }
    case "country": {
      const d = await discoverMovies({ with_origin_country: selected ?? "US", sort_by: "popularity.desc" });
      return d.results;
    }
    case "language": {
      const d = await discoverMovies({ with_original_language: selected ?? "en", sort_by: "popularity.desc" });
      return d.results;
    }
    case "family-friendly": {
      const d = await discoverMovies({ with_genres: "10751", sort_by: "popularity.desc" });
      return d.results;
    }
    case "award-winners": {
      const d = await discoverMovies({ "vote_average.gte": 8, sort_by: "vote_count.desc" });
      return d.results;
    }
    case "voltv-select": {
      if (selected === "popular")  { const d = await discoverMovies({ sort_by: "popularity.desc" }); return d.results; }
      if (selected === "trending") { const d = await discoverMovies({ sort_by: "vote_count.desc" }); return d.results; }
      const d = await getTopRated(1);
      return d.results;
    }
    case "anime": {
      const d = await discoverMovies({ with_genres: "16", with_original_language: "ja", sort_by: "popularity.desc" });
      return d.results;
    }
    case "franchise": {
      if (!selected) return [];
      const res = await fetch(`https://api.themoviedb.org/3/collection/${selected}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}` },
        next: { revalidate: 3600 },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.parts ?? [];
    }
    case "all":
    default: {
      const d = await discoverMovies({ sort_by: "popularity.desc" });
      return d.results;
    }
  }
}

function labelForSelection(slug: Slug, v: string): string {
  if (slug === "genre")    return GENRE_MAP[parseInt(v, 10)] ?? GENRE_TILES.find((g) => g.id === v)?.name ?? v;
  if (slug === "country")  return COUNTRIES.find((c) => c.code === v)?.label ?? v;
  if (slug === "language") return LANGUAGES.find((l) => l.code === v)?.label ?? v;
  return v;
}
