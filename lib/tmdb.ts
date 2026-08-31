// ─────────────────────────────────────
// VOLTV — TMDB API Integration (FREE)
// All endpoints use TMDB v3 REST API
// ─────────────────────────────────────

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";
const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN;

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 }, // 1hr cache — TMDB data changes slowly
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${TMDB_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${path}`);
  }

  return res.json() as T;
}

// ── Image URL helpers ────────────────────────────────────────

export function posterUrl(path: string | null, size: "w185" | "w342" | "w500" | "w780" | "original" = "w500"): string {
  if (!path) return "/placeholder-poster.svg";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null, size: "w780" | "w1280" | "original" = "w1280"): string {
  if (!path) return "/placeholder-backdrop.svg";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function profileUrl(path: string | null, size: "w45" | "w185" | "h632" | "original" = "w185"): string {
  if (!path) return "/placeholder-avatar.svg";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

// ── Movie endpoints ──────────────────────────────────────────

export async function getMovieById(tmdbId: number) {
  return tmdbFetch<TMDBMovieDetail>(`/movie/${tmdbId}`, {
    append_to_response: "videos,credits,similar,watch/providers,external_ids,release_dates",
  });
}

export async function searchMovies(query: string, page = 1) {
  return tmdbFetch<TMDBSearchResult>("/search/movie", {
    query,
    page: String(page),
    include_adult: "false",
  });
}

export async function searchTV(query: string, page = 1) {
  const data = await tmdbFetch<{
    results:       { id: number; name: string; poster_path: string | null; first_air_date?: string; overview: string; vote_average: number; origin_country?: string[]; genre_ids?: number[] }[];
    total_results: number;
    total_pages:   number;
    page:          number;
  }>("/search/tv", { query, page: String(page), include_adult: "false" });
  return {
    ...data,
    results: data.results.map((t) => ({
      id:            t.id,
      title:         t.name,
      poster_path:   t.poster_path,
      release_date:  t.first_air_date ?? "",
      overview:      t.overview,
      vote_average:  t.vote_average,
      genre_ids:     t.genre_ids ?? [],
      origin_country: t.origin_country ?? [],
    })),
  };
}

export async function getTrending(timeWindow: "day" | "week" = "week", page = 1) {
  return tmdbFetch<TMDBSearchResult>(`/trending/movie/${timeWindow}`, {
    page: String(page),
  });
}

export async function getPopular(page = 1) {
  return tmdbFetch<TMDBSearchResult>("/movie/popular", { page: String(page) });
}

export async function getNowPlaying(region = "US", page = 1) {
  return tmdbFetch<TMDBSearchResult>("/movie/now_playing", {
    region,
    page: String(page),
  });
}

export async function getUpcoming(region = "US", page = 1) {
  return tmdbFetch<TMDBSearchResult>("/movie/upcoming", {
    region,
    page: String(page),
  });
}

export async function getTopRated(page = 1) {
  return tmdbFetch<TMDBSearchResult>("/movie/top_rated", { page: String(page) });
}

export async function discoverMovies(params: DiscoverParams) {
  const p: Record<string, string> = {
    include_adult: "false",
    sort_by: params.sort_by ?? "popularity.desc",
    page: String(params.page ?? 1),
  };
  if (params.with_genres)      p.with_genres = params.with_genres;
  if (params.primary_release_year) p.primary_release_year = String(params.primary_release_year);
  if (params.with_origin_country) p.with_origin_country = params.with_origin_country;
  if (params.with_original_language) p.with_original_language = params.with_original_language;
  if (params["primary_release_date.gte"]) p["primary_release_date.gte"] = params["primary_release_date.gte"];
  if (params["release_date.gte"]) p["release_date.gte"] = params["release_date.gte"];
  if (params["release_date.lte"]) p["release_date.lte"] = params["release_date.lte"];
  if (params["vote_average.gte"]) p["vote_average.gte"] = String(params["vote_average.gte"]);
  if (params["with_runtime.lte"]) p["with_runtime.lte"] = String(params["with_runtime.lte"]);

  return tmdbFetch<TMDBSearchResult>("/discover/movie", p);
}

export async function getTVById(tmdbId: number) {
  return tmdbFetch<TMDBTVDetail>(`/tv/${tmdbId}`, {
    append_to_response: "videos,credits,similar,watch/providers,external_ids",
  });
}

export interface TMDBSeasonDetail {
  _id:           string;
  id:            number;
  name:          string;
  overview:      string;
  poster_path:   string | null;
  air_date:      string | null;
  season_number: number;
  episodes:      TMDBEpisode[];
}

export interface TMDBEpisode {
  id:              number;
  name:            string;
  overview:        string;
  still_path:      string | null;
  air_date:        string | null;
  episode_number:  number;
  season_number:   number;
  runtime:         number | null;
  vote_average:    number;
  vote_count:      number;
  crew?:           TMDBCrewMember[];
  guest_stars?:    TMDBCastMember[];
}

export async function getTVSeason(tvId: number, seasonNumber: number) {
  return tmdbFetch<TMDBSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function getTVEpisode(tvId: number, seasonNumber: number, episodeNumber: number) {
  return tmdbFetch<TMDBEpisode>(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`, {
    append_to_response: "credits",
  });
}

export async function discoverTV(params: DiscoverParams & { with_keywords?: string }) {
  const p: Record<string, string> = {
    include_adult: "false",
    sort_by: params.sort_by ?? "popularity.desc",
    page: String(params.page ?? 1),
  };
  if (params.with_genres)            p.with_genres = params.with_genres;
  if (params.with_origin_country)    p.with_origin_country = params.with_origin_country;
  if (params.with_original_language) p.with_original_language = params.with_original_language;
  if (params["vote_average.gte"])    p["vote_average.gte"] = String(params["vote_average.gte"]);
  if (params["release_date.gte"])    p["first_air_date.gte"] = params["release_date.gte"];
  if (params["release_date.lte"])    p["first_air_date.lte"] = params["release_date.lte"];
  if (params.with_keywords)          p.with_keywords = params.with_keywords;

  const data = await tmdbFetch<{ results: { id: number; name: string; poster_path: string | null; first_air_date: string; vote_average?: number }[] }>("/discover/tv", p);
  return {
    results: data.results.map((t) => ({
      id:           t.id,
      title:        t.name,
      poster_path:  t.poster_path,
      release_date: t.first_air_date ?? "",
      vote_average: t.vote_average,
    })),
  };
}

// Marvel Studios = 420, Marvel Entertainment = 7505
export async function getMarvelMovies(page = 1) {
  return tmdbFetch<TMDBSearchResult>("/discover/movie", {
    with_companies: "420|7505",
    sort_by:        "popularity.desc",
    include_adult:  "false",
    page:           String(page),
  });
}

// DC Films = 128064, DC Entertainment = 9993, DC Comics = 429
export async function getDCMovies(page = 1) {
  return tmdbFetch<TMDBSearchResult>("/discover/movie", {
    with_companies: "128064|9993|429",
    sort_by:        "popularity.desc",
    include_adult:  "false",
    page:           String(page),
  });
}

export async function getMovieGenres() {
  return tmdbFetch<{ genres: { id: number; name: string }[] }>("/genre/movie/list");
}

export async function getPersonDetails(personId: number) {
  return tmdbFetch<TMDBPerson>(`/person/${personId}`, {
    append_to_response: "movie_credits,tv_credits,images,external_ids",
  });
}

export interface TMDBTVBasic {
  id:             number;
  name:           string;
  original_name?: string;
  poster_path:    string | null;
  first_air_date: string | null;
  vote_average:   number;
  popularity:     number;
  episode_count?: number;
}

export interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  also_known_as: string[];
  movie_credits: {
    cast: (TMDBMovieBasic & { character?: string })[];
    crew: (TMDBMovieBasic & { job?: string; department?: string })[];
  };
  tv_credits: {
    cast: (TMDBTVBasic & { character?: string; episode_count?: number })[];
    crew: (TMDBTVBasic & { job?: string; department?: string; episode_count?: number })[];
  };
  images: { profiles: { file_path: string; width: number; height: number }[] };
  external_ids: { imdb_id: string | null; instagram_id: string | null; twitter_id: string | null };
}

// ── Trailer extractor ────────────────────────────────────────

export function extractTrailerKey(videos: TMDBVideo[]): string | null {
  const trailer = videos.find(
    (v) => v.site === "YouTube" && v.type === "Trailer" && v.official
  ) ?? videos.find(
    (v) => v.site === "YouTube" && v.type === "Trailer"
  ) ?? videos.find(
    (v) => v.site === "YouTube"
  );
  return trailer?.key ?? null;
}

// ── TMDB Genre ID map ────────────────────────────────────────

export const GENRE_MAP: Record<number, string> = {
  28:    "Action",
  12:    "Adventure",
  16:    "Animation",
  35:    "Comedy",
  80:    "Crime",
  99:    "Documentary",
  18:    "Drama",
  10751: "Family",
  14:    "Fantasy",
  36:    "History",
  27:    "Horror",
  10402: "Music",
  9648:  "Mystery",
  10749: "Romance",
  878:   "Science Fiction",
  10770: "TV Movie",
  53:    "Thriller",
  10752: "War",
  37:    "Western",
};

// ── Types ────────────────────────────────────────────────────

export interface TMDBMovieBasic {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  popularity: number;
  genre_ids: number[];
  overview: string;
  original_language: string;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBMovieDetail extends TMDBMovieBasic {
  runtime: number | null;
  genres: { id: number; name: string }[];
  original_title: string;
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { iso_639_1: string; english_name: string }[];
  imdb_id: string | null;
  videos: { results: TMDBVideo[] };
  credits: { cast: TMDBCastMember[]; crew: TMDBCrewMember[] };
  similar: TMDBSearchResult;
  "watch/providers": { results: Record<string, WatchProviders> };
  external_ids: { imdb_id: string | null };
  release_dates?: {
    results: {
      iso_3166_1: string;
      release_dates: { certification: string; release_date: string; type: number }[];
    }[];
  };
}

export interface TMDBTVDetail {
  id:                    number;
  name:                  string;
  original_name:         string;
  overview:              string;
  poster_path:           string | null;
  backdrop_path:         string | null;
  first_air_date:        string;
  last_air_date:         string | null;
  number_of_seasons:     number;
  number_of_episodes:    number;
  episode_run_time:      number[];
  in_production:         boolean;
  status:                string;
  tagline:               string | null;
  vote_average:          number;
  popularity:            number;
  genres:                { id: number; name: string }[];
  origin_country:        string[];
  original_language:     string;
  production_countries:  { iso_3166_1: string; name: string }[];
  spoken_languages:      { iso_639_1: string; english_name: string }[];
  networks:              { id: number; name: string; logo_path: string | null }[];
  seasons: {
    id:            number;
    season_number: number;
    name:          string;
    overview:      string;
    poster_path:   string | null;
    air_date:      string | null;
    episode_count: number;
  }[];
  videos:       { results: TMDBVideo[] };
  credits:      { cast: TMDBCastMember[]; crew: TMDBCrewMember[] };
  similar:      { results: { id: number; name: string; poster_path: string | null; first_air_date: string; vote_average?: number }[] };
  "watch/providers": { results: Record<string, WatchProviders> };
  external_ids: { imdb_id: string | null };
}

export interface TMDBSearchResult {
  results: TMDBMovieBasic[];
  total_results: number;
  total_pages: number;
  page: number;
}

export interface WatchProviders {
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  link?: string;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface DiscoverParams {
  with_genres?: string;
  primary_release_year?: number;
  with_origin_country?: string;
  with_original_language?: string;
  // release_date.* matches ANY regional release record, so a title whose
  // primary date has passed still comes back. primary_release_date.* filters
  // on the date the API actually returns as release_date.
  "primary_release_date.gte"?: string;
  "release_date.gte"?: string;
  "release_date.lte"?: string;
  "vote_average.gte"?: number;
  "with_runtime.lte"?: number;
  sort_by?: string;
  page?: number;
}
