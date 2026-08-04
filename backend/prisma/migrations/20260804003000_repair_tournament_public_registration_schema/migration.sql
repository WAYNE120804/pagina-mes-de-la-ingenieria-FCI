ALTER TABLE "tournament_participants"
  ADD COLUMN IF NOT EXISTS "identifier" TEXT;

ALTER TABLE "team_members"
  ADD COLUMN IF NOT EXISTS "full_name" TEXT,
  ADD COLUMN IF NOT EXISTS "identifier" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT;

ALTER TABLE "team_members"
  ALTER COLUMN "user_id" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_participants_tournament_id_identifier_key"
  ON "tournament_participants"("tournament_id", "identifier");

CREATE UNIQUE INDEX IF NOT EXISTS "team_members_team_id_identifier_key"
  ON "team_members"("team_id", "identifier");

CREATE UNIQUE INDEX IF NOT EXISTS "team_members_team_id_email_key"
  ON "team_members"("team_id", "email");

ALTER TABLE "team_members"
  DROP CONSTRAINT IF EXISTS "team_members_user_id_fkey";

ALTER TABLE "team_members"
  ADD CONSTRAINT "team_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
