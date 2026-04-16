import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";
import { predictForUser } from "@/lib/prediction-model";

const PredictionSchema = z.object({
  movie_id:        z.string().min(1),
  predicted_score: z.number().min(0).max(10),
});

// GET — model's prediction for a movie for current user
export async function GET(req: NextRequest) {
  const movie_id = req.nextUrl.searchParams.get("movie_id");
  if (!movie_id) return NextResponse.json({ error: "movie_id required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [prediction, userPrediction] = await Promise.all([
    predictForUser(dbUser.id, movie_id),
    prisma.predictions.findUnique({
      where: { user_id_movie_id: { user_id: dbUser.id, movie_id } },
    }),
  ]);

  return NextResponse.json({ data: { model_prediction: prediction, user_prediction: userPrediction } });
}

// POST — user submits their own prediction
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = PredictionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { movie_id, predicted_score } = parsed.data;

  const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Only allow predictions for upcoming/unrated movies
  const movie = await prisma.movie.findUnique({
    where:  { id: movie_id },
    select: { is_upcoming: true, total_ratings_count: true },
  });
  if (!movie) return NextResponse.json({ error: "Movie not found" }, { status: 404 });

  const prediction = await prisma.predictions.upsert({
    where:  { user_id_movie_id: { user_id: dbUser.id, movie_id } },
    create: { user_id: dbUser.id, movie_id, predicted_score },
    update: { predicted_score },
  });

  return NextResponse.json({ data: prediction });
}
