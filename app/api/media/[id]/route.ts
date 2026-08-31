import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Serves an uploaded image out of Postgres. Ids are unique per upload and a
// row is never rewritten, so the response can be cached indefinitely.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const media = await prisma.media.findUnique({
    where:  { id },
    select: { data: true, content_type: true },
  });

  if (!media) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = new Uint8Array(media.data);

  return new NextResponse(body, {
    headers: {
      "Content-Type":   media.content_type,
      "Content-Length": String(body.byteLength),
      "Cache-Control":  "public, max-age=31536000, immutable",
    },
  });
}
