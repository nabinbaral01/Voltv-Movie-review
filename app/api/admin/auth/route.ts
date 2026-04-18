import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const ADMIN_TOKEN    = process.env.ADMIN_COOKIE_SECRET!;

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Ensure the main admin account is flagged as admin in the DB
  // (so the user exists in the Admin team panel and routes that check is_admin allow them)
  try {
    await prisma.user.update({
      where: { username: ADMIN_USERNAME },
      data:  { is_admin: true },
    });
  } catch {
    // If the user doesn't exist yet, silently ignore — the cookie gate still lets them in
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("voltv_admin", ADMIN_TOKEN, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 8, // 8 hours
    path:     "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("voltv_admin");
  return res;
}
