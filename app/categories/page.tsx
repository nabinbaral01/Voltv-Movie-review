import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Sidebar, { BottomNav } from "@/components/layout/Sidebar";

const CATEGORY_CHIPS = [
  "Action", "Adaptation", "Adult Comedy", "Adventure", "Animated", "Anthology", "Art House",
  "Biography", "Black Comedy", "Buddy", "Biopic",
  "Comedy", "Coming of Age", "Conspiracy", "Courtroom", "Crime", "Cult Classic",
  "Dark Comedy", "Disaster", "Documentary", "Drama", "Dystopian",
  "Epic", "Experimental",
  "Family", "Fantasy", "Film Noir", "Folklore",
  "Gangster", "Ghost", "Gothic",
  "Heist", "Historical", "Holiday", "Horror",
  "Indie", "Inspirational",
  "Journalism", "Jungle Adventure",
  "Kids",
  "Legal", "LGBTQ+",
  "Martial Arts", "Medical", "Military", "Mockumentary", "Musical", "Mystery", "Mythology",
  "Neo-Noir",
  "Occult",
  "Parody", "Period Drama", "Political", "Post-Apocalyptic", "Prison", "Psychological",
  "Religious", "Road", "Romance", "Romantic Comedy",
  "Satire", "Sci-Fi", "Serial Killer", "Slasher", "Slice of Life", "Spy", "Sports", "Superhero", "Supernatural", "Survival",
  "Teen", "Thriller", "Time Travel", "Tragedy", "True Story",
  "Urban",
  "Vampire", "Vigilante",
  "War", "Western", "Whodunit",
  "Zombie Apocalypse",
];

function groupAlpha(items: string[]) {
  const out: Record<string, string[]> = {};
  for (const x of items) {
    const k = x[0].toUpperCase();
    (out[k] ??= []).push(x);
  }
  return out;
}

const GROUPED = groupAlpha(CATEGORY_CHIPS);

const TOP_SECTIONS = [
  { slug: "genre",          label: "Genres" },
  { slug: "country",        label: "Countries" },
  { slug: "language",       label: "Languages" },
  { slug: "family-friendly",label: "Family Friendly" },
  { slug: "award-winners",  label: "Award Winners" },
  { slug: "voltv-select",   label: "VoltV Select" },
  { slug: "anime",          label: "Anime" },
  { slug: "franchise",      label: "Franchise" },
];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Topbar />
      <div className="flex pt-14">
        <div className="hidden lg:block w-[240px] shrink-0"><Sidebar /></div>

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-24 lg:pb-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <h1 className="text-2xl font-bold text-white">Categories</h1>
              <input
                type="search"
                placeholder="Search category"
                className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-[#505060] focus:border-white/30 outline-none w-full sm:w-72"
              />
            </div>

            {/* Top sections */}
            <div className="flex flex-wrap gap-2 mb-8">
              {TOP_SECTIONS.map((s) => (
                <Link
                  key={s.slug}
                  href={`/categories/${s.slug}`}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-colors"
                >
                  {s.label}
                </Link>
              ))}
            </div>

            {/* Alphabetical */}
            <div className="space-y-6">
              {Object.keys(GROUPED).sort().map((letter) => (
                <section key={letter}>
                  <h2 className="text-lg font-bold text-white mb-3">{letter}</h2>
                  <div className="flex flex-wrap gap-2">
                    {GROUPED[letter].map((name) => (
                      <Link
                        key={name}
                        href={`/categories/genre?v=${encodeURIComponent(slugifyToGenreId(name))}`}
                        className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-[#E5E5EE] hover:text-white transition-colors"
                      >
                        {name}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

// Best-effort map free-form label → TMDB genre id; fallback to Action (28).
function slugifyToGenreId(name: string): string {
  const MAP: Record<string, number> = {
    Action: 28, Adventure: 12, Animated: 16, Comedy: 35, Crime: 80,
    Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36,
    Horror: 27, Musical: 10402, Mystery: 9648, Romance: 10749, "Sci-Fi": 878,
    "Romantic Comedy": 10749, Thriller: 53, War: 10752, Western: 37,
  };
  return String(MAP[name] ?? 28);
}
