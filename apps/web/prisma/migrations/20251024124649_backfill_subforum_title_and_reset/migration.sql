/*
  SQLite-safe migration

  Fixes:
  - Uses TEXT for JSON storage (SQLite) and default '[]' for Post.imageUrls.
  - Backfills Subforum.title during table redefinition so NOT NULL is satisfied.
  - Keeps your existing data for all tables.
*/

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id"        TEXT      NOT NULL PRIMARY KEY,
    "email"     TEXT      NOT NULL,
    "token"     TEXT      NOT NULL,
    "expiresAt" DATETIME  NOT NULL,
    "createdAt" DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables (SQLite pattern)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Comment
CREATE TABLE "new_Comment" (
    "id"         TEXT      NOT NULL PRIMARY KEY,
    "postId"     TEXT      NOT NULL,
    "userEmail"  TEXT      NOT NULL,
    "parentId"   TEXT,
    "body"       TEXT      NOT NULL DEFAULT '',
    "createdAt"  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  DATETIME  NOT NULL,
    CONSTRAINT "Comment_postId_fkey"    FOREIGN KEY ("postId")    REFERENCES "Post" ("id")    ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User" ("email") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentId_fkey"  FOREIGN KEY ("parentId")  REFERENCES "Comment" ("id") ON DELETE SET NULL  ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("body","createdAt","id","parentId","postId","updatedAt","userEmail")
SELECT "body","createdAt","id","parentId","postId","updatedAt","userEmail" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId","createdAt");

-- Post
-- IMPORTANT: SQLite stores JSON as TEXT. Use TEXT NOT NULL DEFAULT '[]'
CREATE TABLE "new_Post" (
    "id"           TEXT      NOT NULL PRIMARY KEY,
    "title"        TEXT      NOT NULL,
    "body"         TEXT,
    "mediaUrl"     TEXT,
    "imageUrls"    TEXT      NOT NULL DEFAULT '[]',
    "userEmail"    TEXT      NOT NULL,
    "subforumName" TEXT      NOT NULL,
    "createdAt"    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    DATETIME  NOT NULL,
    CONSTRAINT "Post_userEmail_fkey"     FOREIGN KEY ("userEmail")    REFERENCES "User" ("email")   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_subforumName_fkey"  FOREIGN KEY ("subforumName") REFERENCES "Subforum" ("name") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("createdAt","id","imageUrls","mediaUrl","subforumName","title","updatedAt","userEmail","body")
SELECT
  "createdAt","id","imageUrls","mediaUrl","subforumName","title","updatedAt","userEmail","body"
FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");
CREATE INDEX "Post_subforumName_createdAt_idx" ON "Post"("subforumName","createdAt");

-- Saved
CREATE TABLE "new_Saved" (
    "id"         TEXT      NOT NULL PRIMARY KEY,
    "userEmail"  TEXT      NOT NULL,
    "postId"     TEXT      NOT NULL,
    "createdAt"  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Saved_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User" ("email") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Saved_postId_fkey"    FOREIGN KEY ("postId")    REFERENCES "Post" ("id")   ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Saved" ("createdAt","id","postId","userEmail")
SELECT "createdAt","id","postId","userEmail" FROM "Saved";
DROP TABLE "Saved";
ALTER TABLE "new_Saved" RENAME TO "Saved";
CREATE INDEX "Saved_postId_idx" ON "Saved"("postId");
CREATE UNIQUE INDEX "Saved_userEmail_postId_key" ON "Saved"("userEmail","postId");

-- Subforum
-- NOTE: Backfill NOT NULL "title" using existing "name" for existing rows.
CREATE TABLE "new_Subforum" (
    "name"       TEXT      NOT NULL PRIMARY KEY,
    "title"      TEXT      NOT NULL,
    "description" TEXT,
    "createdAt"  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  DATETIME  NOT NULL
);
INSERT INTO "new_Subforum" ("name","title","description","createdAt","updatedAt")
SELECT
  "name",
  -- backfill: set title = name for existing rows
  COALESCE(NULLIF("title", ''), "name"),
  "description",
  "createdAt",
  "updatedAt"
FROM (
  -- If the old table had no "title" column, this subselect maps it to NULL
  SELECT "name","description","createdAt","updatedAt", NULL AS "title"
  FROM "Subforum"
);
DROP TABLE "Subforum";
ALTER TABLE "new_Subforum" RENAME TO "Subforum";

-- Vote
CREATE TABLE "new_Vote" (
    "id"         TEXT      NOT NULL PRIMARY KEY,
    "userEmail"  TEXT      NOT NULL,
    "postId"     TEXT      NOT NULL,
    "value"      INTEGER   NOT NULL,
    "createdAt"  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User" ("email") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_postId_fkey"    FOREIGN KEY ("postId")    REFERENCES "Post" ("id")   ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vote" ("createdAt","id","postId","userEmail","value")
SELECT "createdAt","id","postId","userEmail","value" FROM "Vote";
DROP TABLE "Vote";
ALTER TABLE "new_Vote" RENAME TO "Vote";
CREATE INDEX "Vote_postId_idx" ON "Vote"("postId");
CREATE UNIQUE INDEX "Vote_userEmail_postId_key" ON "Vote"("userEmail","postId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Indexes for reset tokens
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_email_createdAt_idx" ON "PasswordResetToken"("email","createdAt");
