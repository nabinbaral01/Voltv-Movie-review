import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

// Redirect /profile/me → /profile/[username]
export default async function MyProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
    select: { username: true },
  });

  if (!dbUser?.username) redirect("/login");
  redirect(`/profile/${dbUser.username}`);
}
