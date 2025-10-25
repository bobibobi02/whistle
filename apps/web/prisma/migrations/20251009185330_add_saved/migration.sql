/*
  Warnings:

  - You are about to drop the `CommentVote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PasswordResetToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `userId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Subforum` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userEmail,postId]` on the table `Saved` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userEmail,postId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.
  - Made the column `userEmail` on table `Comment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `Post` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userEmail` on table `Post` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CommentVote_commentId_userEmail_key";

-- DropIndex
DROP INDEX "CommentVote_commentId_idx";

-- DropIndex
DROP INDEX "PasswordResetToken_expires_idx";

-- DropIndex
DROP INDEX "PasswordResetToken_email_idx";

-- DropIndex
DROP INDEX "PasswordResetToken_token_key";

-- DropIndex
DROP INDEX "Saved_postId_userEmail_key";

-- DropIndex
DROP INDEX "Session_expires_idx";

-- DropIndex
DROP INDEX "VerificationToken_expires_idx";

-- DropIndex
DROP INDEX "Vote_postId_userEmail_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CommentVote";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PasswordResetToken";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("content", "createdAt", "id", "parentId", "postId", "updatedAt", "userEmail") SELECT "content", "createdAt", "id", "parentId", "postId", "updatedAt", "userEmail" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");
CREATE INDEX "Comment_userEmail_idx" ON "Comment"("userEmail");
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "userEmail" TEXT NOT NULL,
    "subforumName" TEXT NOT NULL DEFAULT 'General',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_subforumName_fkey" FOREIGN KEY ("subforumName") REFERENCES "Subforum" ("name") ON DELETE SET DEFAULT ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("content", "createdAt", "id", "mediaUrl", "subforumName", "title", "updatedAt", "userEmail") SELECT "content", "createdAt", "id", "mediaUrl", "subforumName", "title", "updatedAt", "userEmail" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE INDEX "Post_userEmail_idx" ON "Post"("userEmail");
CREATE INDEX "Post_subforumName_idx" ON "Post"("subforumName");
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");
CREATE TABLE "new_Subforum" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT
);
INSERT INTO "new_Subforum" ("description", "name") SELECT "description", "name" FROM "Subforum";
DROP TABLE "Subforum";
ALTER TABLE "new_Subforum" RENAME TO "Subforum";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("email", "emailVerified", "id", "name", "password") SELECT "email", "emailVerified", "id", "name", "password" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Saved_userEmail_postId_key" ON "Saved"("userEmail", "postId");

-- CreateIndex
CREATE INDEX "Vote_userEmail_idx" ON "Vote"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userEmail_postId_key" ON "Vote"("userEmail", "postId");
