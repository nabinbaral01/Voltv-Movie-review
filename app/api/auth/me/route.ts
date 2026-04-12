import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("voltv_session")?.value;
  if (session && session.length > 1) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "No session" }, { status: 401 });
}
