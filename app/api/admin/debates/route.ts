import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLiveAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!(await requireLiveAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    question?:    string;
    option_a?:    string;
    option_b?:    string;
    movie_a_id?:  string;
    movie_b_id?:  string;
    category?:    string;
    debate_date?: string;
  };

  const question    = body.question?.trim();
  const option_a    = body.option_a?.trim();
  const option_b    = body.option_b?.trim();
  const movie_a_id  = body.movie_a_id;
  const movie_b_id  = body.movie_b_id;
  const category    = (body.category ?? "general").trim().toLowerCase();
  const dateInput   = body.debate_date;

  if (!question || !option_a || !option_b) {
    return NextResponse.json({ error: "Question and both options are required" }, { status: 400 });
  }
  if (!movie_a_id || !movie_b_id) {
    return NextResponse.json({ error: "Pick both movies" }, { status: 400 });
  }
  if (movie_a_id === movie_b_id) {
    return NextResponse.json({ error: "Movies must be different" }, { status: 400 });
  }

  const debate_date = dateInput ? new Date(dateInput) : new Date();
  debate_date.setUTCHours(0, 0, 0, 0);
  const expires_at = new Date(debate_date);
  expires_at.setUTCHours(23, 59, 59, 999);

  try {
    const debate = await prisma.dailyDebate.create({
      data: {
        question, option_a, option_b,
        movie_a_id, movie_b_id,
        category, debate_date, expires_at,
      },
    });
    return NextResponse.json({ data: debate }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Create failed";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: `A "${category}" debate already exists for that date` }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
