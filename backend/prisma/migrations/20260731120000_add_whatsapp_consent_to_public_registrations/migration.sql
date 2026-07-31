ALTER TABLE "attendances"
  ADD COLUMN "whatsapp_consent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tournament_participants"
  ADD COLUMN "whatsapp_consent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "team_members"
  ADD COLUMN "whatsapp_consent" BOOLEAN NOT NULL DEFAULT false;
