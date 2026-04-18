import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_TOKEN = process.env.ADMIN_COOKIE_SECRET!;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (req.cookies.get("voltv_admin")?.value !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const hide = Boolean(body.is_hidden);

  const updated = await prisma.review.update({
    where:  { id },
    data:   { is_hidden: hide },
    select: { id: true, is_hidden: true },
  });
  return NextResponse.json({ data: updated });
}
