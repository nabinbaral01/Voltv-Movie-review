// ─────────────────────────────────────
// VOLTV — Global TypeScript Types
// ─────────────────────────────────────

// Re-export Prisma enums for use throughout the app
export type {
  SubscriptionTier,
  WatchStatus,
  VoltVVerdict,
  ReviewType,
  DebateChoice,
  BadgeType,
  LeaderboardPeriod,
  NotificationType,
  PredictionStatus,
} from "@prisma/client";

// ─────────────────────────────────────
// USER TYPES
// ─────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  personality_type: string | null;
  taste_dna: TasteDNA | null;
  level: number;
  xp_points: number;
  streak_count: number;
  subscription_tier: "free" | "pro" | "legend";
  is_blue_tick: boolean;
  is_phone_verified: boolean;
  created_at: string;
  last_active: string;
  // Computed
  followers_count?: number;
  following_count?: number;
  movies_count?: number;
  total_hours?: number;
  countries_count?: number;
}

export interface TasteDNA {
  action: number;
  drama: number;
  horror: number;
  comedy: number;
  scifi: number;
  romance: number;
  thriller: number;
  anime: number;
  [key: string]: number;
}

export type PersonalityType =
  | "The Dark Visionary"
  | "The Popcorn King"
  | "The Cry Baby"
  | "The Auteur"
  | "The Globe Trotter"
  | "The Time Traveler"
  | "The Thrill Seeker"
  | "The Laugh Track"
  | "The Sci-Fi Oracle"
  | "The Romantic";

export type UserLevel = "Cinephile" | "Critic" | "Auteur" | "Legend";

export interface UserStats {
  total_movies: number;
  total_hours: number;
  countries_count: number;
  longest_streak: number;
  total_reviews: number;
  avg_rating: number;
  genres_watched: number;
  decades_watched: number;
}

// ─────────────────────────────────────
// MOVIE TYPES
// ─────────────────────────────────────

export interface Movie {
  id: string;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: string[];
  languages: string[];
  countries: string[];
  tmdb_rating: number | null;
  tmdb_popularity: number | null;
  imdb_id: string | null;
  imdb_rating: number | null;
  rt_score: number | null;
  voltv_score: number | null;
  voltv_skip_pct: number;
  voltv_timepass_pct: number;
  voltv_watchit_pct: number;
  voltv_masterpiece_pct: number;
  streaming_platforms: StreamingPlatform[] | null;
  total_ratings_count: number;
  total_reviews_count: number;
  is_upcoming: boolean;
  editors_pick: boolean;
}

export interface StreamingPlatform {
  name: string;
  logo_url: string;
  url: string;
  type: "stream" | "rent" | "buy";
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: { id: number; name: string }[];
  original_language: string;
  production_countries: { iso_3166_1: string; name: string }[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  imdb_id: string | null;
  videos?: {
    results: { key: string; site: string; type: string }[];
  };
}

export interface MovieCard {
  id: string;
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  release_date: string | null;
  voltv_score: number | null;
  genres: string[];
  runtime: number | null;
  is_upcoming?: boolean;
}

// ─────────────────────────────────────
// RATING TYPES
// ─────────────────────────────────────

export interface Rating {
  id: string;
  user_id: string;
  movie_id: string;
  story: number;
  direction: number;
  acting: number;
  visuals: number;
  rewatch: number;
  voltv_verdict: "skip" | "timepass" | "watchit" | "masterpiece";
  overall_score: number;
  weight_applied: number;
  created_at: string;
}

export interface RatingInput {
  story: number;
  direction: number;
  acting: number;
  visuals: number;
  rewatch: number;
  voltv_verdict: "skip" | "timepass" | "watchit" | "masterpiece";
}

export interface VoltVMeterData {
  skip_pct: number;
  timepass_pct: number;
  watchit_pct: number;
  masterpiece_pct: number;
  total_votes: number;
}

export interface DimensionScores {
  story: number;
  direction: number;
  acting: number;
  visuals: number;
  rewatch: number;
}

// ─────────────────────────────────────
// REVIEW TYPES
// ─────────────────────────────────────

export interface Review {
  id: string;
  user_id: string;
  movie_id: string;
  content: string;
  type: "hot_take" | "full_review";
  is_spoiler: boolean;
  likes_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  user?: Pick<UserProfile, "id" | "username" | "avatar_url" | "subscription_tier" | "is_blue_tick">;
  is_liked?: boolean;
}

// ─────────────────────────────────────
// HEATMAP TYPES
// ─────────────────────────────────────

export interface HeatmapDay {
  date: string;         // YYYY-MM-DD
  count: number;        // movies logged this day
  movies: {
    title: string;
    poster_url: string | null;
  }[];
  intensity: 0 | 1 | 2 | 3 | 4; // 0=none, 1=1, 2=2-3, 3=4-5, 4=6+
}

export interface HeatmapData {
  days: HeatmapDay[];
  total_days_active: number;
  total_movies: number;
  longest_streak: number;
  current_streak: number;
}

// ─────────────────────────────────────
// DEBATE TYPES
// ─────────────────────────────────────

export interface DailyDebate {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  category?: string;
  movie_a: MovieCard;
  movie_b: MovieCard;
  votes_a: number;
  votes_b: number;
  debate_date: string;
  expires_at: string;
  user_vote?: "a" | "b" | null;
}

// ─────────────────────────────────────
// BADGE TYPES
// ─────────────────────────────────────

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: "common" | "rare" | "epic" | "legendary";
  earned: boolean;
  earned_at?: string;
  requirement?: string;
}

export const ALL_BADGES: Omit<Badge, "earned" | "earned_at">[] = [
  // Common
  { id: "first_review",      name: "First Review",       description: "Write your first review",          icon: "✍️",  type: "common" },
  { id: "streak_starter",    name: "Streak Starter",     description: "Maintain a 7-day streak",          icon: "🔥",  type: "common" },
  { id: "centurion",         name: "Centurion",          description: "Log 100 movies",                   icon: "💯",  type: "common" },
  { id: "genre_explorer",    name: "Genre Explorer",     description: "Watch movies in 5 genres",         icon: "🧭",  type: "common" },
  { id: "first_debate",      name: "Debate Voter",       description: "Vote in your first debate",        icon: "🗳️",  type: "common" },
  { id: "first_prediction",  name: "Oracle Initiate",   description: "Make your first prediction",       icon: "🔮",  type: "common" },
  // Rare
  { id: "nolan_complete",    name: "Nolan Completionist",description: "Rate all Christopher Nolan films", icon: "🎬",  type: "rare" },
  { id: "horror_master",     name: "Horror Master",      description: "Log 50 horror films",              icon: "🎃",  type: "rare" },
  { id: "world_cinema",      name: "World Cinema",       description: "Watch films from 20 countries",    icon: "🌍",  type: "rare" },
  { id: "decade_hopper",     name: "Decade Hopper",      description: "Watch films from every decade",    icon: "⏳",  type: "rare" },
  { id: "hot_take_king",     name: "Hot Take King",      description: "Get 100 upvotes on hot takes",     icon: "🌶️",  type: "rare" },
  // Epic
  { id: "debate_champion",   name: "Debate Champion",    description: "Win 10 debate predictions",        icon: "🏆",  type: "epic" },
  { id: "top_predictor",     name: "Top Predictor",      description: "Finish top 3 in monthly predictions", icon: "🎯", type: "epic" },
  { id: "review_legend",     name: "Review Legend",      description: "Write 100 full reviews",           icon: "📖",  type: "epic" },
  { id: "taste_twin_finder", name: "Taste Twin Finder",  description: "Find 5 Cinema Twins",              icon: "👯",  type: "epic" },
  // Legendary
  { id: "voltv_og",          name: "VOLTV OG",           description: "One of the first 1000 VOLTV users", icon: "⚡", type: "legendary" },
  { id: "streak_god",        name: "Streak God",         description: "Maintain a 365-day streak",        icon: "👑",  type: "legendary" },
  { id: "cinematic_sage",    name: "Cinematic Sage",     description: "Reach Legend tier",                icon: "🌌",  type: "legendary" },
];

// ─────────────────────────────────────
// XP SYSTEM
// ─────────────────────────────────────

export const XP_REWARDS = {
  log_movie:          10,
  write_review:       25,
  rate_movie:          5,
  win_debate:         15,
  weekly_challenge:   50,
  earn_rare_badge:   100,
  daily_debate_vote:   5,
  first_review_movie: 20,
} as const;

export const LEVEL_THRESHOLDS = {
  Cinephile: 0,
  Critic:    500,
  Auteur:    2000,
  Legend:    5000,
} as const;

// ─────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ─────────────────────────────────────
// ACTIVITY FEED TYPES
// ─────────────────────────────────────

export type ActivityType =
  | "rated_movie"
  | "added_watchlist"
  | "wrote_review"
  | "earned_badge"
  | "completed_challenge"
  | "debate_vote"
  | "created_collection"
  | "followed_user";

export interface ActivityItem {
  id: string;
  user: Pick<UserProfile, "id" | "username" | "avatar_url" | "subscription_tier">;
  activity_type: ActivityType;
  movie?: MovieCard;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ─────────────────────────────────────
// PREDICTION TYPES
// ─────────────────────────────────────

export interface Prediction {
  id: string;
  user_id: string;
  movie: MovieCard;
  predicted_score: number;
  actual_score: number | null;
  accuracy_pct: number | null;
  status: "pending" | "resolved";
  created_at: string;
}

// ─────────────────────────────────────
// COMPATIBILITY TYPES
// ─────────────────────────────────────

export interface TasteCompatibility {
  score: number;           // 0-100
  label: string;           // "Cinema Twins" etc.
  common_movies: number;
  common_genres: string[];
}

// ─────────────────────────────────────
// COLLECTION TYPES
// ─────────────────────────────────────

export interface Collection {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  mood_tag: string | null;
  genre_tag: string | null;
  is_public: boolean;
  likes_count: number;
  movie_count?: number;
  movies?: MovieCard[];
  created_at: string;
  user?: Pick<UserProfile, "id" | "username" | "avatar_url">;
}

// ─────────────────────────────────────
// NOTIFICATION TYPES
// ─────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  related_movie?: MovieCard;
  related_user?: Pick<UserProfile, "id" | "username" | "avatar_url">;
  created_at: string;
}

// ─────────────────────────────────────
// MOOD TAGS (Discovery)
// ─────────────────────────────────────

export const MOOD_TAGS = [
  { id: "feel_good",    label: "Feel-Good",    emoji: "😊", genres: ["Comedy", "Family", "Animation"] },
  { id: "emotional",   label: "Emotional",    emoji: "😢", genres: ["Drama", "Romance"] },
  { id: "mind_bending",label: "Mind-Bending", emoji: "🤯", genres: ["Science Fiction", "Mystery", "Thriller"] },
  { id: "action",      label: "Action-Packed", emoji: "💥", genres: ["Action", "Adventure"] },
  { id: "scary",       label: "Scary",        emoji: "😱", genres: ["Horror"] },
  { id: "romantic",    label: "Romantic",     emoji: "❤️", genres: ["Romance"] },
  { id: "comedy",      label: "Comedy",       emoji: "😂", genres: ["Comedy"] },
  { id: "comfort",     label: "Comfort Rewatch", emoji: "🎭", genres: [] },
  { id: "scifi",       label: "Sci-Fi",       emoji: "🚀", genres: ["Science Fiction"] },
] as const;

export const DECADES = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"] as const;

export const STREAMING_SERVICES = [
  "Netflix", "Prime Video", "Disney+", "Apple TV+",
  "HBO Max", "Hulu", "Peacock", "Paramount+",
] as const;
