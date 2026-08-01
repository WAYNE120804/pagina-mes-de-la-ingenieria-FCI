ALTER TABLE "events"
  ADD COLUMN "competition_mode" "CompetitionMode" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "max_members_per_team" INTEGER;

ALTER TABLE "attendances"
  ADD COLUMN "team_name" TEXT;
