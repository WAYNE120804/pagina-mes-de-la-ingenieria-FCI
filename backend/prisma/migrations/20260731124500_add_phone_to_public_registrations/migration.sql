ALTER TABLE "attendances"
  ADD COLUMN "phone" TEXT;

ALTER TABLE "tournament_participants"
  ADD COLUMN "phone" TEXT;

ALTER TABLE "team_members"
  ADD COLUMN "phone" TEXT;
