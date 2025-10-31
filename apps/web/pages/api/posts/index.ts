// pages/api/posts/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
const prisma = new PrismaClient();

type Col = { name: string; notnull: 0|1; dflt_value: any };

async function postCols(): Promise<Col[]> {
  try { return await prisma.$queryRawUnsafe<Col[]>(`PRAGMA table_info('Post')`); }
  catch { return []; }
}
function has(cols: Col[], n: string){ return cols.some(c => c.name.toLowerCase() === n.toLowerCase()); }
function genId(){ return crypto.randomBytes(16).toString("hex"); }

async function insertPostRaw(val:{title:string; body:string; userId?:string; forumId?:string|null}){
  const cols = await postCols();
  const cl:string[] = [], vl:string[] = []; const params:any[] = [];
  // ALWAYS set id if column exists
  if (has(cols,"id")) { cl.push("id"); vl.push("?"); params.push(genId()); }
  if (has(cols,"title")) { cl.push("title"); vl.push("?"); params.push(val.title); }
  if (has(cols,"body"))  { cl.push("body");  vl.push("?"); params.push(val.body); }
  if (has(cols,"userId") || has(cols,"userid")) { cl.push(has(cols,"userId")?"userId":"userid"); vl.push("?"); params.push(val.userId); }

  // forum FK if any of these columns exist
  const fk = has(cols,"subforumId")||has(cols,"subforumid") ? "subforumId"
          : has(cols,"forumId")||has(cols,"forumid")         ? "forumId"
          : has(cols,"communityId")||has(cols,"communityid") ? "communityId"
          : null;
  if (fk && val.forumId){ cl.push(fk); vl.push("?"); params.push(val.forumId); }

  // timestamps if present — just set them
  if (has(cols,"createdAt")||has(cols,"createdat")) { cl.push(has(cols,"createdAt")?"createdAt":"createdat"); vl.push("?"); params.push(new Date().toISOString()); }
  if (has(cols,"updatedAt")||has(cols,"updatedat")) { cl.push(has(cols,"updatedAt")?"updatedAt":"updatedat"); vl.push("?"); params.push(new Date().toISOString()); }

  if (!cl.length) throw new Error("No insertable columns in Post");
  await prisma.$executeRawUnsafe(`INSERT INTO Post (${cl.join(",")}) VALUES (${vl.join(",")})`, ...params);
  const row = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Post ORDER BY rowid DESC LIMIT 1`);
  return row?.[0] ?? { ok:true };
}

function detectForumTable = async () => {
  // Use PRAGMA foreign keys info to guess; fallback to column presence
  try {
    const fks = await prisma.$queryRawUnsafe<any[]>(`PRAGMA foreign_key_list('Post')`);
    const t = fks?.find(x => ["Subforum","Forum","Community"].includes(String(x.table)))?.table;
    if (t) return String(t);
  } catch {}
  const cols = await postCols();
  if (has(cols,"subforumId")||has(cols,"subforumid")) return "Subforum";
  if (has(cols,"forumId")||has(cols,"forumid"))       return "Forum";
  if (has(cols,"communityId")||has(cols,"communityid")) return "Community";
  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method==="GET"){
      const take = Math.max(1, Math.min(100, Number(req.query.limit)||12));
      const posts = await prisma.post.findMany({
        take, orderBy:[{ createdAt: "desc" as const }],
        include:{ user:{ select:{ id:true, name:true } } }
      }).catch(async()=> prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Post ORDER BY rowid DESC LIMIT ${take}`));
      return res.status(200).json(posts);
    }

    if (req.method==="POST"){
      const session = await getServerSession(req, res, authOptions);
      let userId = (session?.user as any)?.id ?? null;
      let userEmail = (session?.user as any)?.email ?? null;

      if (!userId && !userEmail && process.env.NODE_ENV!=="production"){
        const any = await prisma.user.findFirst();
        userId = any?.id ?? null; userEmail = any?.email ?? null;
      }
      if (!userId && !userEmail) return res.status(401).json({ error:"Not authenticated" });
      if (!userId && userEmail){ const u = await prisma.user.findUnique({ where:{ email:userEmail } }); userId = u?.id ?? null; }

      const { title, body="" } = (req.body||{}) as {title?:string; body?:string};
      if (!title) return res.status(400).json({ error:"title required" });

      // try clean Prisma first
      try{
        const data:any = { title, body, user: { connect: userEmail ? { email:userEmail } : { id:userId! } } };
        const forumTable = await detectForumTable();
        if (forumTable){
          // connect by title/name = "General" if exists
          const byTitle = await (prisma as any)[forumTable.toLowerCase()].findFirst({ where:{ title:"General" } }).catch(()=>null);
          const byName  = byTitle || await (prisma as any)[forumTable.toLowerCase()].findFirst({ where:{ name:"General" } }).catch(()=>null);
          if (byName?.title) data[forumTable.toLowerCase()] = { connect:{ title:"General" } };
          else if (byName?.name) data[forumTable.toLowerCase()] = { connect:{ name:"General" } };
        }
        const created = await prisma.post.create({ data });
        return res.status(201).json(created);
      }catch(_e){ /* fall through to raw */ }

      // fallback raw with explicit id
      const forumTable = await detectForumTable();
      let forumId:string|null = null;
      if (forumTable){
        try{
          const r = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM ${forumTable} WHERE name='General' OR title='General' ORDER BY rowid DESC LIMIT 1`);
          forumId = r?.[0]?.id ?? null;
        }catch{}
      }
      const row = await insertPostRaw({ title, body, userId: userId ?? undefined, forumId });
      return res.status(201).json(row);
    }

    res.setHeader("Allow","GET, POST");
    return res.status(405).json({ error:"Method Not Allowed" });
  }catch(e:any){
    console.error(e); return res.status(500).json({ error: e?.message || "Internal Server Error" });
  }
}
