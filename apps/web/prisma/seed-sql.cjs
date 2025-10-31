// prisma/seed-sql.cjs
const { PrismaClient } = require("@prisma/client");
const crypto = require("node:crypto");
const prisma = new PrismaClient();
const genId = () => crypto.randomBytes(16).toString("hex");
const nowIso = () => new Date().toISOString();

async function cols(table){ try { return await prisma.$queryRawUnsafe(`PRAGMA table_info('`+table+`')`);} catch{ return []; } }
const has = (cs,n)=> cs.some(c=>String(c.name).toLowerCase()===n.toLowerCase());

async function ensureUser(){
  const u = await prisma.user.upsert({
    where:{ email:"demo@example.com" }, update:{},
    create:{ email:"demo@example.com", name:"Demo User", passwordHash:"dev" }
  });
  return u.id;
}
async function ensureForum(){
  for (const key of ["subforum","forum","community"]){
    if (!prisma[key]) continue;
    try{ await prisma[key].upsert({ where:{ title:"General" }, update:{}, create:{ title:"General", description:"Default forum" } }); return; }catch{}
    try{ await prisma[key].upsert({ where:{ name:"General"  }, update:{}, create:{ name:"General",  description:"Default forum" } }); return; }catch{}
    try{ await prisma[key].create({ data:{ title:"General", description:"Default forum" } }); return; }catch{}
    try{ await prisma[key].create({ data:{ name:"General",  description:"Default forum" } }); return; }catch{}
  }
}

async function insertPost(userId){
  const p = await cols("Post");
  const cl=[], vl=[], params=[];
  if (has(p,"id")){ cl.push("id"); vl.push("?"); params.push(genId()); }
  if (has(p,"title")){ cl.push("title"); vl.push("?"); params.push("Hello from Whistle"); }
  if (has(p,"body")) { cl.push("body");  vl.push("?"); params.push("Seeded from seed"); }
  if (has(p,"userId")||has(p,"userid")){ cl.push(has(p,"userId")?"userId":"userid"); vl.push("?"); params.push(userId); }

  const fk = has(p,"subforumId")||has(p,"subforumid") ? "subforumId"
          : has(p,"forumId")||has(p,"forumid")         ? "forumId"
          : has(p,"communityId")||has(p,"communityid") ? "communityId" : null;
  if (fk){
    const table = fk==="subforumId"?"Subforum":fk==="forumId"?"Forum":"Community";
    try{
      const r = await prisma.$queryRawUnsafe(`SELECT * FROM ${table} WHERE name='General' OR title='General' ORDER BY rowid DESC LIMIT 1`);
      const fid = r?.[0]?.id ?? null;
      if (fid){ cl.push(fk); vl.push("?"); params.push(fid); }
    }catch{}
  }
  if (has(p,"createdAt")||has(p,"createdat")){ cl.push(has(p,"createdAt")?"createdAt":"createdat"); vl.push("?"); params.push(nowIso()); }
  if (has(p,"updatedAt")||has(p,"updatedat")){ cl.push(has(p,"updatedAt")?"updatedAt":"updatedat"); vl.push("?"); params.push(nowIso()); }

  await prisma.$executeRawUnsafe(`INSERT INTO Post (${cl.join(",")}) VALUES (${vl.join(",")})`, ...params);
}

async function main(){
  const uid = await ensureUser();
  await ensureForum();

  // Try normal Prisma first
  try{
    await prisma.post.create({ data:{ title:"Hello from Whistle", body:"Seeded from seed", user:{ connect:{ id:uid } } } });
    console.log("✅ Seeded via Prisma");
    return;
  }catch{}

  // Fallback raw (forces id)
  await insertPost(uid);
  console.log("✅ Seeded via RAW");
}
main().catch(e=>{ console.error("Seed failed:", e); process.exit(1); })
  .finally(async()=> prisma.$disconnect());
