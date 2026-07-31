ALTER TABLE "events"
  ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';

ALTER TABLE "tournaments"
  ALTER COLUMN "status" SET DEFAULT 'REGISTRATION_OPEN';

ALTER TABLE "hackathon_events"
  ALTER COLUMN "status" SET DEFAULT 'REGISTRATION_OPEN';

UPDATE "events"
SET "status" = 'PUBLISHED'
WHERE "status" = 'DRAFT';

UPDATE "tournaments"
SET "status" = 'REGISTRATION_OPEN'
WHERE "status" = 'DRAFT';

UPDATE "hackathon_events"
SET "status" = 'REGISTRATION_OPEN'
WHERE "status" = 'DRAFT';
