import { getTrending } from "@/lib/tmdb";
import LoginForm from "./LoginForm";

async function getPosters() {
  try {
    const data = await getTrending("week", 1);
    return data.results
      .filter((m) => m.poster_path)
      .slice(0, 16)
      .map((m) => ({
        id: m.id,
        title: m.title,
        poster_path: m.poster_path!,
      }));
  } catch {
    return [];
  }
}

export default async function LoginPage() {
  const posters = await getPosters();
  return <LoginForm posters={posters} />;
}
