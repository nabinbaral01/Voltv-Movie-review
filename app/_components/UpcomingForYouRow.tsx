import { getSessionUser } from "@/lib/auth";
import { getUpcomingForYou } from "@/lib/upcoming-for-you";
import { MovieRow } from "@/components/movie/MovieCard";

// Streams in on its own so the TMDB call never blocks the rest of the feed.
export default async function UpcomingForYouRow() {
  const me = await getSessionUser();
  const upcoming = await getUpcomingForYou(me?.id ?? null);

  if (upcoming.items.length === 0) return null;

  const title = upcoming.personalised
    ? `Upcoming for you · ${upcoming.genres.slice(0, 2).join(" & ")}`
    : "Upcoming worldwide";

  return (
    <MovieRow
      title={title}
      movies={upcoming.items}
      size="md"
      viewAllHref="/discover?filter=upcoming"
    />
  );
}
