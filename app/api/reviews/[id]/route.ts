import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";

const PatchSchema = z.object({
  content:      z.string().max(2000).optional(),
  is_spoiler:   z.boolean().optional(),
  is_anonymous: z.boolean().optional(),
  visibility:   z.enum(["public", "unlisted", "followers"]).optional(),
  is_hidden:    z.boolean().optional(),
});

async function getOwner(id: string, supaId: string) {
  const [dbUser, review] = await Promise.all([
    prisma.user.findUnique({ where: { supabase_id: supaId }, select: { id: true, is_admin: true } }),
    prisma.review.findUnique({ where: { id }, select: { id: true, user_id: true } }),
  ]);
  if (!dbUser || !review) return null;
  const isOwner = review.user_id === dbUser.id;
  return { dbUser, review, isOwner };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctxRow = await getOwner(id, user.id);
  if (!ctxRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!ctxRow.isOwner && !ctxRow.dbUser.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // Only admins can set is_hidden via this route (moderation)
  if (parsed.data.is_hidden !== undefined && !ctxRow.dbUser.is_admin && !ctxRow.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.review.update({
    where: { id },
    data:  {
      ...parsed.data,
      ...(parsed.data.content !== undefined ? { edited_at: new Date() } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctxRow = await getOwner(id, user.id);
  if (!ctxRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!ctxRow.isOwner && !ctxRow.dbUser.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
