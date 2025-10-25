/*
  Warnings:

  - You are about to alter the column `imageUrls` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "mediaUrl" TEXT,
    "imageUrls" JSONB NOT NULL DEFAULT [],
    "userEmail" TEXT NOT NULL,
    "subforumName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User" ("email") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Post_subforumName_fkey" FOREIGN KEY ("subforumName") REFERENCES "Subforum" ("name") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("body", "createdAt", "id", "imageUrls", "mediaUrl", "subforumName", "title", "updatedAt", "userEmail") SELECT "body", "createdAt", "id", "imageUrls", "mediaUrl", "subforumName", "title", "updatedAt", "userEmail" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");
CREATE INDEX "Post_subforumName_createdAt_idx" ON "Post"("subforumName", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
