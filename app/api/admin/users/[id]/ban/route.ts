import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_TOKEN = process.env.ADMIN_COOKIE_SECRET!;
const MAIN_ADMIN  = process.env.ADMIN_USERNAME!;

function requireAdmin(req: NextRequest) {
  return req.cookies.get("voltv_admin")?.value === ADMIN_TOKEN;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const ban = Boolean(body.is_banned);

  const target = await prisma.user.findUnique({
    where:  { id },
    select: { id: true, username: true },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.username === MAIN_ADMIN) {
    return NextResponse.json({ error: "Cannot ban the main administrator" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where:  { id },
    data:   { is_banned: ban },
    select: { id: true, is_banned: true },
  });

  return NextResponse.json({ data: updated });
}
