-- CreateEnum
CREATE TYPE "CompetitionMode" AS ENUM ('TEAM', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "VideoGameTitle" AS ENUM ('FIFA', 'CALL_OF_DUTY');

-- CreateEnum
CREATE TYPE "TournamentRulePreset" AS ENUM ('FOOTBALL', 'BASKETBALL', 'VIDEO_GAME', 'TABLE_TENNIS', 'CHESS', 'ROBOTICS_BATTLE', 'CUSTOM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Sport" ADD VALUE 'VIDEOJUEGOS';
ALTER TYPE "Sport" ADD VALUE 'ROBOTICA';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "away_participant_id" UUID,
ADD COLUMN     "home_participant_id" UUID,
ADD COLUMN     "winner_participant_id" UUID;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "allows_draws" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "max_participants" INTEGER,
ADD COLUMN     "mode" "CompetitionMode" NOT NULL DEFAULT 'TEAM',
ADD COLUMN     "points_draw" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "points_loss" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "points_win" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "restriction_group" TEXT,
ADD COLUMN     "rule_preset" "TournamentRulePreset" NOT NULL DEFAULT 'CUSTOM',
ADD COLUMN     "video_game_title" "VideoGameTitle";

-- CreateTable
CREATE TABLE "tournament_participants" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "user_id" UUID,
    "group_id" UUID,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "seed" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournament_participants_user_id_idx" ON "tournament_participants"("user_id");

-- CreateIndex
CREATE INDEX "tournament_participants_group_id_idx" ON "tournament_participants"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournament_id_user_id_key" ON "tournament_participants"("tournament_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournament_id_email_key" ON "tournament_participants"("tournament_id", "email");

-- CreateIndex
CREATE INDEX "matches_home_participant_id_idx" ON "matches"("home_participant_id");

-- CreateIndex
CREATE INDEX "matches_away_participant_id_idx" ON "matches"("away_participant_id");

-- CreateIndex
CREATE INDEX "tournaments_mode_format_idx" ON "tournaments"("mode", "format");

-- CreateIndex
CREATE INDEX "tournaments_restriction_group_idx" ON "tournaments"("restriction_group");

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "tournament_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_participant_id_fkey" FOREIGN KEY ("home_participant_id") REFERENCES "tournament_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_participant_id_fkey" FOREIGN KEY ("away_participant_id") REFERENCES "tournament_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_participant_id_fkey" FOREIGN KEY ("winner_participant_id") REFERENCES "tournament_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
