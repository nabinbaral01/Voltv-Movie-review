import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMG = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
    select: { id: true, is_banned: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (dbUser.is_banned) return NextResponse.json({ error: "Account banned" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "avatar");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (kind !== "avatar" && kind !== "banner" && kind !== "post") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (!ALLOWED_IMG.has(file.type)) {
    // Media lives in Postgres, so video is intentionally not accepted here.
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or GIF images can be uploaded" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Max ${MAX_BYTES / 1024 / 1024} MB` }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  const media = await prisma.media.create({
    data: {
      user_id:      dbUser.id,
      kind,
      content_type: file.type,
      size_bytes:   buf.byteLength,
      data:         buf,
    },
    select: { id: true },
  });

  // Same-origin URL served by app/api/media/[id]. Storing a relative path keeps
  // the images working across localhost, previews and production alike.
  const url = `/api/media/${media.id}`;

  if (kind === "avatar" || kind === "banner") {
    await prisma.user.update({
      where: { id: dbUser.id },
      data:  kind === "avatar" ? { avatar_url: url } : { banner_url: url },
    });

    // Only the current avatar/banner is ever rendered — drop superseded ones
    // so the table does not grow without bound.
    await prisma.media.deleteMany({
      where: { user_id: dbUser.id, kind, id: { not: media.id } },
    });
  }

  return NextResponse.json({ data: { url, kind, media_type: "image" } });
}
