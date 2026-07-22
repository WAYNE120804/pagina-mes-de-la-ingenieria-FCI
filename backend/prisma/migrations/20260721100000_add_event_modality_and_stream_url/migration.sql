CREATE TYPE "EventModality" AS ENUM ('PRESENTIAL', 'HYBRID', 'VIRTUAL');

ALTER TABLE "events"
  ADD COLUMN "modality" "EventModality" NOT NULL DEFAULT 'PRESENTIAL',
  ADD COLUMN "stream_url" TEXT;
