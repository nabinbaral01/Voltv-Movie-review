import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const COOKIE = "voltv_session";

function emailFor(username: string) {
  return `${username.toLowerCase()}@voltv.local`;
}

function sbPasswordFor(password: string) {
  return password.length >= 8 ? password : `${password}__voltv_pad`;
}

export async function POST(req: NextRequest) {
  const { username: rawUsername, password, mode } = await req.json();

  const username = typeof rawUsername === "string" ? rawUsername.trim() : "";
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "Username: 3-20 chars, letters, numbers, underscore only" },
      { status: 400 },
    );
  }
  if (typeof password !== "string" || password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { username } });

  // ── SIGNUP ──
  if (mode === "signup") {
    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const email = emailFor(username);

    // Accounts live entirely in our own Postgres: the password is verified with
    // bcrypt below and the session is our own cookie. supabase_id is just the
    // stable user identity every route reads off that cookie, so we mint it
    // locally instead of round-tripping to the Supabase Admin API.
    const userId = randomUUID();

    let created;
    try {
      created = await prisma.user.create({
        data: {
          supabase_id: userId,
          username,
          password_hash: hash,
          email,
        },
      });
    } catch (err) {
      // Unique constraint — someone claimed the username between our check and insert
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      console.error("[signup] failed to create user", err);
      return NextResponse.json({ error: "Could not create account" }, { status: 500 });
    }

    const jar = await cookies();
    jar.set(COOKIE, created.supabase_id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: false,
    });
    return NextResponse.json({ ok: true, username });
  }

  // ── LOGIN ──
  if (!existingUser) {
    return NextResponse.json({ error: "User not found. Please sign up first." }, { status: 404 });
  }

  // If user has password_hash, verify with bcrypt
  if (existingUser.password_hash) {
    const valid = await bcrypt.compare(password, existingUser.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
  } else {
    // Legacy user without password_hash — try Supabase auth and migrate.
    // Supabase may be unreachable; that must not crash the login route.
    try {
      const { createServerSupabaseClient } = await import("@/lib/supabase-server");
      const supabase = await createServerSupabaseClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailFor(username),
        password: sbPasswordFor(password),
      });
      if (signInErr) {
        return NextResponse.json({ error: "Wrong password" }, { status: 401 });
      }
    } catch (err) {
      console.error("[login] legacy Supabase verification unavailable", err);
      return NextResponse.json(
        { error: "This account needs a password reset. Please use 'Forgot?' to contact an admin." },
        { status: 503 },
      );
    }
    // Migrate: save bcrypt hash for future logins
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { password_hash: hash },
    });
  }

  const jar = await cookies();
  jar.set(COOKIE, existingUser.supabase_id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: false,
  });
  return NextResponse.json({ ok: true, username: existingUser.username });
}

export async function DELETE() {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: false,
  });
  return NextResponse.json({ ok: true });
}
