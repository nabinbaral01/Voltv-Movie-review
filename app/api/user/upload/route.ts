import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server";

const BUCKET = "user-media";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMG = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VID = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_VIDEO   = 25 * 1024 * 1024; // 25 MB

let bucketEnsured = false;
async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  if (bucketEnsured) return;
  const { data } = await admin.storage.getBucket(BUCKET);
  if (!data) await admin.storage.createBucket(BUCKET, { public: true });
  bucketEnsured = true;
}

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
  const isVideo = ALLOWED_VID.has(file.type);
  const isImage = ALLOWED_IMG.has(file.type);
  if (!isImage && !(isVideo && kind === "post")) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }
  const limit = isVideo ? MAX_VIDEO : MAX_BYTES;
  if (file.size > limit) {
    return NextResponse.json({ error: `Max ${Math.round(limit / 1024 / 1024)} MB` }, { status: 400 });
  }

  const admin = createAdminClient();
  await ensureBucket(admin);

  const ext  = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${dbUser.id}/${kind}-${Date.now()}.${ext}`;
  const buf  = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: true });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  if (kind === "avatar" || kind === "banner") {
    await prisma.user.update({
      where: { id: dbUser.id },
      data:  kind === "avatar" ? { avatar_url: url } : { banner_url: url },
    });
  }

  return NextResponse.json({ data: { url, kind, media_type: isVideo ? "video" : "image" } });
}
