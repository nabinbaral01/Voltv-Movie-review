// ─────────────────────────────────────
// VOLTV Personality Engine
// Zero API cost — pure data logic
// ─────────────────────────────────────

import type { TasteDNA, PersonalityType } from "@/types";

interface WatchHistoryEntry {
  genres: string[];
}

interface DirectorEntry {
  name: string;
  count: number;
}

// Compute TasteDNA from watch history genres
export function computeTasteDNA(movies: WatchHistoryEntry[]): TasteDNA {
  const counts: Record<string, number> = {
    action: 0, drama: 0, horror: 0, comedy: 0,
    scifi: 0, romance: 0, thriller: 0, anime: 0,
  };

  const genreMap: Record<string, keyof typeof counts> = {
    "Action":           "action",
    "Adventure":        "action",
    "Drama":            "drama",
    "Horror":           "horror",
    "Comedy":           "comedy",
    "Science Fiction":  "scifi",
    "Romance":          "romance",
    "Thriller":         "thriller",
    "Mystery":          "thriller",
    "Animation":        "anime",
    "Anime":            "anime",
  };

  for (const movie of movies) {
    for (const genre of movie.genres) {
      const key = genreMap[genre];
      if (key) counts[key]++;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const dna: TasteDNA = {} as TasteDNA;
  for (const [k, v] of Object.entries(counts)) {
    dna[k] = Math.round((v / total) * 100);
  }
  return dna;
}

// Determine personality type from watch data
export function computePersonality(params: {
  tasteDNA: TasteDNA;
  totalMovies: number;
  countriesCount: number;
  classicMovies: number;       // pre-1990
  directorsCompleted: DirectorEntry[]; // directors with 5+ films watched
  avgReleaseYear: number;
}): PersonalityType {
  const { tasteDNA, totalMovies, countriesCount, classicMovies, directorsCompleted, avgReleaseYear } = params;

  // Director completionist check (5+ films of same director)
  if (directorsCompleted.length >= 1) {
    return "The Auteur";
  }

  // Globe Trotter — 10+ countries
  if (countriesCount >= 10) {
    return "The Globe Trotter";
  }

  // Time Traveler — loves classics (avg release year before 1990 or 40%+ classic)
  if (avgReleaseYear < 1990 || (totalMovies > 20 && classicMovies / totalMovies > 0.4)) {
    return "The Time Traveler";
  }

  // Genre-dominant personalities
  const dominant = Object.entries(tasteDNA).sort((a, b) => b[1] - a[1])[0];

  switch (dominant[0]) {
    case "thriller":
    case "horror":   return "The Dark Visionary";
    case "action":   return "The Popcorn King";
    case "drama":
    case "romance":  return "The Cry Baby";
    case "comedy":   return "The Laugh Track";
    case "scifi":    return "The Sci-Fi Oracle";
    default:         return "The Cry Baby";
  }
}

// Taste compatibility between two users (0-100)
export function computeCompatibility(
  dnaA: TasteDNA,
  dnaB: TasteDNA,
  sharedRatings: { scoreA: number; scoreB: number }[]
): number {
  // Genre overlap score (40% weight)
  const genreKeys = Object.keys(dnaA);
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (const key of genreKeys) {
    dotProduct += (dnaA[key] ?? 0) * (dnaB[key] ?? 0);
    magA       += (dnaA[key] ?? 0) ** 2;
    magB       += (dnaB[key] ?? 0) ** 2;
  }
  const genreSimilarity = magA && magB ? dotProduct / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;

  if (sharedRatings.length === 0) {
    return Math.round(genreSimilarity * 100);
  }

  // Rating correlation score (60% weight)
  const avgDiff =
    sharedRatings.reduce((sum, r) => sum + Math.abs(r.scoreA - r.scoreB), 0) /
    sharedRatings.length;
  const ratingScore = Math.max(0, 1 - avgDiff / 10);

  const score = genreSimilarity * 0.4 + ratingScore * 0.6;
  return Math.round(score * 100);
}

// Compatibility label from score
export function compatibilityLabel(score: number): string {
  if (score >= 90) return "Cinema Twins 👯";
  if (score >= 75) return "Taste Siblings 🎬";
  if (score >= 60) return "Film Cousins 🎭";
  if (score >= 40) return "Different Tastes 🎲";
  return "Cinema Opposites 🌓";
}

// Compute level from XP
export function levelFromXP(xp: number): { level: number; title: string; progress: number; nextThreshold: number } {
  const thresholds = [
    { min: 0,    title: "Cinephile" },
    { min: 500,  title: "Critic"    },
    { min: 2000, title: "Auteur"    },
    { min: 5000, title: "Legend"    },
  ];

  let currentTier = thresholds[0];
  let nextThreshold = thresholds[1].min;

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i].min) {
      currentTier = thresholds[i];
      nextThreshold = thresholds[i + 1]?.min ?? Infinity;
      break;
    }
  }

  const progress =
    nextThreshold === Infinity
      ? 100
      : Math.round(((xp - currentTier.min) / (nextThreshold - currentTier.min)) * 100);

  const level = thresholds.findIndex((t) => t.min === currentTier.min) + 1;
  return { level, title: currentTier.title, progress, nextThreshold };
}
