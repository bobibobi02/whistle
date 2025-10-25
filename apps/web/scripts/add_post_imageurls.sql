PRAGMA foreign_keys=OFF;

-- Add JSON column for image URLs (stored as TEXT in SQLite) with a backfill default
ALTER TABLE "Post" ADD COLUMN "imageUrls" TEXT NOT NULL DEFAULT '[]';

PRAGMA foreign_keys=ON;
