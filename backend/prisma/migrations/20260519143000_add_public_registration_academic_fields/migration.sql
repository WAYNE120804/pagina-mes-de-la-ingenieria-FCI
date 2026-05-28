ALTER TABLE "attendances"
ADD COLUMN "semester" TEXT,
ADD COLUMN "career" TEXT;

ALTER TABLE "tournament_participants"
ADD COLUMN "semester" TEXT,
ADD COLUMN "career" TEXT;

ALTER TABLE "team_members"
ADD COLUMN "semester" TEXT,
ADD COLUMN "career" TEXT;
