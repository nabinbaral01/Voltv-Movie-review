import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const ADMIN_TOKEN = process.env.ADMIN_COOKIE_SECRET!;

async function gate() {
  const jar = await cookies();
  return jar.get("voltv_admin")?.value === ADMIN_TOKEN;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await gate())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.dailyDebate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
