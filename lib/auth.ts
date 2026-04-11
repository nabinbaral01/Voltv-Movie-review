import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "voltv_session";

export async function getSessionUser() {
  const jar = await cookies();
  const supabaseId = jar.get(SESSION_COOKIE)?.value;
  if (!supabaseId) return null;

  const user = await prisma.user.findUnique({
    where: { supabase_id: supabaseId },
  });
  return user;
}
