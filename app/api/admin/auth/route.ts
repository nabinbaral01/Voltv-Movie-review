import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, signAdminCookie } from "@/lib/admin-auth";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

function setAdminCookie(res: NextResponse, value: string) {
  res.cookies.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 8,
    path:     "/",
  });
  return res;
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // ── Path 1: main admin via env credentials ──
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    try {
      await prisma.user.update({
        where: { username: ADMIN_USERNAME },
        data:  { is_admin: true },
      });
    } catch {
      // main admin user row may not exist yet — cookie gate still allows entry
    }
    const token = signAdminCookie({ kind: "main" });
    return setAdminCookie(NextResponse.json({ success: true, via: "main" }), token);
  }

  // ── Path 2: granted admin logs in with their own account credentials ──
  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
    select: { id: true, is_admin: true, is_banned: true, password_hash: true },
  });

  if (!user || !user.is_admin || user.is_banned || !user.password_hash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signAdminCookie({ kind: "user", userId: user.id });
  return setAdminCookie(NextResponse.json({ success: true, via: "granted" }), token);
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
