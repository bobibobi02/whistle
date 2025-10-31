// prisma/seed.cjs
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function ensureForum() {
  const models = [
    { key: "subforum", make: (data) => prisma.subforum.create({ data }), upsert: (where, data) => prisma.subforum.upsert({ where, update: {}, create: data }) },
    { key: "forum",     make: (data) => prisma.forum.create({ data }),     upsert: (where, data) => prisma.forum.upsert({ where, update: {}, create: data }) },
    { key: "community", make: (data) => prisma.community.create({ data }), upsert: (where, data) => prisma.community.upsert({ where, update: {}, create: data }) },
  ];
  for (const m of models) {
    if (!prisma[m.key]) continue;
    try {
      const rec = await m.upsert({ title: "General" }, { title: "General", description: "Default forum" });
      return { key: m.key, where: { title: rec.title || "General" } };
    } catch {}
    try {
      const rec = await m.upsert({ name: "General" }, { name: "General", description: "Default forum" });
      return { key: m.key, where: { name: rec.name || "General" } };
    } catch {}
    try {
      const rec = await m.make({ title: "General", description: "Default forum" }).catch(() => m.make({ name: "General", description: "Default forum" }));
      if (rec?.title) return { key: m.key, where: { title: rec.title } };
      if (rec?.name)  return { key: m.key, where: { name: rec.name } };
    } catch {}
  }
  return null;
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: { email: "demo@example.com", name: "Demo User", passwordHash: "dev" },
  });

  const forum = await ensureForum();
  const base = { title: "Hello from Whistle", body: "Seeded from seed.cjs" };
  const variants = [];

  if (forum?.key && forum?.where) {
    variants.push({ ...base, user: { connect: { email: user.email } }, [forum.key]: { connect: forum.where } });
  }
  variants.push({ ...base, user: { connect: { email: user.email } } });
  variants.push({ ...base, userId: user.id });

  let created = null;
  for (const data of variants) { try { created = await prisma.post.create({ data }); break; } catch {} }
  if (!created) throw new Error("Post creation failed — check required fields of Post model.");

  console.log("✅ Seeded: demo user + 1 post");
}

main().catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
