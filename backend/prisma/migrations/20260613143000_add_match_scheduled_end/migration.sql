ALTER TABLE "matches"
ADD COLUMN IF NOT EXISTS "scheduled_ends_at" TIMESTAMP(3);
