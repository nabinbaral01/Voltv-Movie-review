/* eslint-disable */
require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg }     = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

(async () => {
  const admins = await prisma.user.findMany({
    where: { is_admin: true },
    select: {
      username: true,
      is_admin: true,
      is_banned: true,
      password_hash: true,
      supabase_id: true,
    },
  });
  console.log(`Found ${admins.length} admin user(s):`);
  for (const a of admins) {
    console.log({
      username:     a.username,
      is_admin:     a.is_admin,
      is_banned:    a.is_banned,
      has_password: Boolean(a.password_hash),
      supabase_id:  a.supabase_id.slice(0, 8) + "…",
    });
  }
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
