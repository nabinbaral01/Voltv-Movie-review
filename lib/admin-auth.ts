import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const ADMIN_COOKIE = "voltv_admin";

const SECRET = process.env.ADMIN_COOKIE_SECRET!;

export type AdminSubject =
  | { kind: "main" }
  | { kind: "user"; userId: string };

function hmac(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

function encodeSubject(subject: AdminSubject): string {
  return subject.kind === "main" ? "main" : `u:${subject.userId}`;
}

export function signAdminCookie(subject: AdminSubject): string {
  const payload = encodeSubject(subject);
  return `${payload}.${hmac(payload)}`;
}

export function verifyAdminCookie(raw: string | undefined | null): AdminSubject | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx <= 0) return null;
  const payload = raw.slice(0, idx);
  const sig     = raw.slice(idx + 1);
  const expect  = hmac(payload);
  if (sig.length !== expect.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expect, "hex"))) return null;
  } catch {
    return null;
  }
  if (payload === "main") return { kind: "main" };
  if (payload.startsWith("u:")) {
    const userId = payload.slice(2);
    if (!userId) return null;
    return { kind: "user", userId };
  }
  return null;
}

/**
 * Per-request admin gate. Verifies the signed cookie AND, for granted admins,
 * re-checks the DB so a revoked user loses access immediately.
 */
export async function requireLiveAdmin(): Promise<AdminSubject | null> {
  const jar = await cookies();
  const subject = verifyAdminCookie(jar.get(ADMIN_COOKIE)?.value);
  if (!subject) return null;
  if (subject.kind === "main") return subject;

  const user = await prisma.user.findUnique({
    where:  { id: subject.userId },
    select: { is_admin: true, is_banned: true },
  });
  if (!user || !user.is_admin || user.is_banned) return null;
  return subject;
}
