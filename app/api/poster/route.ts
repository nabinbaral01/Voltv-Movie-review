import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "image.tmdb.org",
  "img.youtube.com",
  "i.ytimg.com",
]);

function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120) || "poster";
}

export async function GET(req: NextRequest) {
  const url  = req.nextUrl.searchParams.get("url");
  const name = req.nextUrl.searchParams.get("name") ?? "poster";
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString(), { cache: "force-cache" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Upstream failed" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.includes("png")  ? "png"
            : contentType.includes("webp") ? "webp"
            : contentType.includes("gif")  ? "gif"
            : "jpg";
  const filename = `${safeName(name)}.${ext}`;

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":        contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "public, max-age=86400",
    },
  });
}
