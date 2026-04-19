# VOLTV

A social-first movie platform — Letterboxd meets Netflix meets Twitter.

Rate movies across five dimensions, cast your vote in daily debates, follow taste-twins, and let a five-layer hybrid recommendation engine surface 45+ personalized picks across Netflix-style rails. Includes a full admin panel with stats, moderation, debate scheduling, and live activity graphs.

**Stack:** Next.js 16 (Turbopack) · TypeScript · Prisma 7 · Neon Postgres · Tailwind · Recharts · Lucide

---

## Features

### For users
- **5-dimension ratings** (story, direction, acting, visuals, rewatch) rolled into a weighted VOLTV score
- **Reviews & posts** with likes, bookmarks, replies, media uploads, visibility controls, @mentions
- **Social feed** — Facebook-style For You / Following tabs, "Who to follow" and "Top critics" side rail
- **Daily Debates** — Side A vs Side B voting across multiple categories per day (today's release, anime, classic, blockbuster, indie), +5 XP per vote
- **For You recommendations** — five-layer hybrid engine (collaborative filtering, content-based, ML feature scoring, deep-embedding cosine match, recency boost) delivering 45–100+ picks across 9–12 Netflix-style rails anchored on the user's top-rated title, favorite genres, taste twins, and bookmarks
- **Profile** — Taste DNA vector, XP/level progression (Cinephile → Critic → Auteur → Legend), streaks, blue tick at 100 XP, followers/following, badges
- **Extras** — watch-history heatmap, collections, predictions, leaderboard, time-grouped notifications, Pro/Legend tiers

### For admins (`/admin`)
- Dashboard with 30-day activity graph, user/post/rating deltas, pro-conversion %, pending reports
- User moderation — grant admin, ban/unban, with main-admin safeguards
- Post moderation — hide/restore with optimistic UI
- Debates manager — category picker, movie typeahead search, custom vote labels, date scheduling, poster downloads
- Report queue

---

## Getting started

```bash
npm install
npx prisma generate
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Env vars (`.env.local`)

```
DATABASE_URL=              # Neon Postgres connection string
DIRECT_URL=                # Neon direct URL for migrations
ADMIN_USERNAME=            # admin panel username
ADMIN_PASSWORD=            # admin panel password
ADMIN_COOKIE_SECRET=       # random string — validates voltv_admin cookie
TMDB_API_KEY=              # TMDB v3 api key
# … plus Supabase auth keys
```

### Share your dev server publicly

```bash
# start the app
npm run dev -- -H 0.0.0.0

# in another terminal — expose to the internet
cloudflared tunnel --url http://localhost:3000
```

---

## Project layout

```
app/
  admin/                    # Admin panel (cookie-gated)
  api/                      # Route handlers
  debates/                  # Public daily-debate page
  recommendations/          # For-You page
  movie/[id]/               # Movie detail
  profile/[username]/       # Public profile + follower lists
  social/                   # Feed
lib/
  recommendation-engine.ts  # 5-layer hybrid recommender
  xp-system.ts              # XP, levels, blue-tick threshold
  prisma.ts
components/
prisma/
  schema.prisma
proxy.ts                    # Auth gate + admin gate
```
