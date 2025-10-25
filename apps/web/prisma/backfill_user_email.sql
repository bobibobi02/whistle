-- Backfill from the user relation when possible
UPDATE Post
SET userEmail = (
  SELECT email FROM User WHERE User.id = Post.userId
)
WHERE userEmail IS NULL AND userId IS NOT NULL;

-- Any rows still NULL (no userId to match)? give them a neutral placeholder
UPDATE Post
SET userEmail = 'unknown@local'
WHERE userEmail IS NULL;
