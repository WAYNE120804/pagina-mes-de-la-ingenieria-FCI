CREATE TYPE "AttendeeCategory" AS ENUM ('ESTUDIANTE', 'PROFESOR', 'ADMINISTRATIVO', 'GRADUADO', 'OTRO');

ALTER TABLE "attendances"
ADD COLUMN "identifier" TEXT,
ADD COLUMN "category" "AttendeeCategory";

CREATE UNIQUE INDEX "attendances_event_id_identifier_key" ON "attendances"("event_id", "identifier");
CREATE INDEX "attendances_identifier_idx" ON "attendances"("identifier");
