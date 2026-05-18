ALTER TABLE "venues" ADD COLUMN "photo_url" TEXT;

ALTER TABLE "tournaments" ADD COLUMN "venue_id" UUID;

ALTER TABLE "tournaments"
  ADD CONSTRAINT "tournaments_venue_id_fkey"
  FOREIGN KEY ("venue_id")
  REFERENCES "venues"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "tournaments_venue_id_idx" ON "tournaments"("venue_id");
