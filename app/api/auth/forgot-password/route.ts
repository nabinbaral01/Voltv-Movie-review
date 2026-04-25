import { NextRequest, NextResponse } from "next/server";

// Username-based auth has no email channel, so self-serve resets would be
// a security hole. This endpoint accepts the request and always returns a
// generic response — an admin handles the actual reset out-of-band.
// Returning ok either way avoids leaking account existence.
export async function POST(req: NextRequest) {
  const { username: raw } = await req.json().catch(() => ({}));
  const username = typeof raw === "string" ? raw.trim() : "";

  if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "Enter a valid username" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
