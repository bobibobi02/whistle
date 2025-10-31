# ======= WHISTLE ONE-SHOT FIX + SEED (fixed quotes) =======

Write-Host "`n=== 1) .env ==="
@"
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-dev-dev"
"@ | Set-Content .\.env -Encoding UTF8

Write-Host "`n=== 2) Prisma ==="
npx prisma generate
try { npx prisma migrate dev --name init } catch { npx prisma db push }

# --- 3) Fix [postId].tsx: import React/memo + React.memo( -> memo(
$post = ".\pages\post\[postId].tsx"
if (Test-Path $post) {
  $t = (Get-Content $post | Out-String)
  if ($t -notmatch 'import\s+React') {
    $t = "import React, { memo } from 'react';`r`n" + $t
  } elseif ($t -notmatch '\bmemo\b') {
    $t = $t -replace "import\s+React\s+from\s+'react';","import React, { memo } from 'react';"
  }
  $t = $t -replace 'React\.memo\(', 'memo('
  Set-Content $post $t -Encoding UTF8
  Write-Host "✔ Patched [postId].tsx"
}

# --- 4) Fix feed.tsx: safe .map + default array state
$feed = ".\pages\feed.tsx"
if (Test-Path $feed) {
  $f = (Get-Content $feed | Out-String)

  # Make posts.map safe
  $f = $f -replace 'posts\.map\(', '(Array.isArray(posts) ? (posts as any[]) : []).map('

  # Ensure default state (best-effort)
  if ($f -notmatch 'useState<\s*FeedPost\[\]\s*>\(') {
    $f = $f -replace 'useState\(\s*\)', 'useState<FeedPost[]>([])'
  }

  Set-Content $feed $f -Encoding UTF8
  Write-Host "✔ Patched feed.tsx"
}

# --- 5) Make router.replace shallow (avoid re-mount flashes)
Get-ChildItem .\pages -Recurse -Include *.tsx | ForEach-Object {
  $code = (Get-Content $_.FullName | Out-String)
  $new  = $code -replace 'router\.replace\(\s*router\.asPath\s*\)', 'router.replace(router.asPath, undefined, { shallow: true })'
  if ($new -ne $code) {
    Set-Content $_.FullName $new -Encoding UTF8
    Write-Host "✔ Shallow routing in $($_.Name)"
  }
}

# --- 6) Clean package.json and strip BOM
$pkg = ".\package.json"
if (Test-Path $pkg) {
  $p = (Get-Content $pkg | Out-String)

  # remove deprecated "prisma": {...} regardless of leading/trailing comma position
  $p = $p -replace ',"prisma"\s*:\s*\{[^}]*\}', ''
  $p = $p -replace '"prisma"\s*:\s*\{[^}]*\},\s*', ''

  Set-Content $pkg $p -Encoding UTF8

  # Strip BOM
  $path = Join-Path (Get-Location) "package.json"
  $bytes = Get-Content $path -Encoding Byte
  if ($bytes.Length -gt 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
      $bytes = $bytes[3..($bytes.Length-1)]
      [System.IO.File]::WriteAllBytes($path, $bytes)
      Write-Host "✔ Stripped BOM from package.json"
  }
  Write-Host "✔ package.json cleaned"
}

# --- 7) Seed DB with demo user/subforum/posts ---
$seedDir = ".\prisma"
if (-not (Test-Path $seedDir)) { New-Item -ItemType Directory -Force -Path $seedDir | Out-Null }

$seedFile = ".\prisma\seed.cjs"
$seedContent = @"
// prisma/seed.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ensureUser() {
  return prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: { email: 'demo@example.com', name: 'Demo User', passwordHash: 'dev' },
  });
}

async function ensureSubforum() {
  return prisma.subforum.upsert({
    where: { slug: 'general' },
    update: {},
    create: { slug: 'general', title: 'General', description: 'Default subforum' },
  });
}

async function seedPosts(userId, subforumId) {
  for (let i = 1; i <= 5; i++) {
    await prisma.post.create({
      data: {
        title: `Hello Whistle #\${i}`,
        body: `This is a seeded post number \${i}.`,
        userId,
        subforumId,
        imageUrls: [], // remove if your schema doesn't have this
      },
    });
  }
}

async function main() {
  const user = await ensureUser();
  const sub = await ensureSubforum();
  await seedPosts(user.id, sub.id);
  console.log('✅ Seeded demo data');
}
main().catch(e => { console.error('Seed failed:', e); process.exit(1); })
       .finally(async () => { await prisma.$disconnect(); });
"
$seedContent | Set-Content $seedFile -Encoding UTF8

Write-Host "`n=== Seeding demo content ==="
node .\prisma\seed.cjs

# --- 8) Add server-side guard for /api/vote/stats (if handler exists) ---
$voteApi = ".\pages\api\vote\stats.ts"
if (Test-Path $voteApi) {
  $v = (Get-Content $voteApi | Out-String)
  if ($v -notmatch 'postIds required') {
    $v = $v -replace '(export default\s+async\s+function\s+\w*\s*\(\s*req\s*,\s*res\s*\)\s*\{)',
                     "$1`r`n  if (req.method !== 'POST') return res.status(405).end();`r`n  const { postIds } = req.body || {};`r`n  if (!Array.isArray(postIds) || postIds.length === 0) return res.status(400).json({ error: 'postIds required' });`r`n"
    Set-Content $voteApi $v -Encoding UTF8
    Write-Host "✔ Guarded /api/vote/stats"
  }
}

Write-Host "`n=== 9) Install & run dev ==="
npm install
npm run dev

# ========================================================
