-- AlterTable
ALTER TABLE "tournament_standings" ADD COLUMN "participant_id" UUID;
ALTER TABLE "tournament_standings" ALTER COLUMN "team_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tournament_standings_tournament_id_group_id_participant_id_key" ON "tournament_standings"("tournament_id", "group_id", "participant_id");
CREATE INDEX "tournament_standings_participant_id_idx" ON "tournament_standings"("participant_id");

-- AddForeignKey
ALTER TABLE "tournament_standings" ADD CONSTRAINT "tournament_standings_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
