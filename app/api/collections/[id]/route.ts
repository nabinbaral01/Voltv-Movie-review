import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";

const PatchSchema = z.object({
  title:       z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  is_public:   z.boolean().optional(),
});

async function authorize(collectionId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const [dbUser, collection] = await Promise.all([
    prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } }),
    prisma.collection.findUnique({ where: { id: collectionId }, select: { user_id: true } }),
  ]);
  if (!dbUser)     return { err: NextResponse.json({ error: "User not found" },     { status: 404 }) };
  if (!collection) return { err: NextResponse.json({ error: "Collection not found" }, { status: 404 }) };
  if (collection.user_id !== dbUser.id) {
    return { err: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return {};
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { err } = await authorize(id);
  if (err) return err;

  const body   = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const updated = await prisma.collection.update({
    where: { id },
    data:  parsed.data,
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { err } = await authorize(id);
  if (err) return err;

  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
