-- CreateEnum
CREATE TYPE "UserPosition" AS ENUM ('DIRECTIVO', 'PROFESOR', 'REPRESENTANTE', 'ESTUDIANTE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "position" "UserPosition" NOT NULL DEFAULT 'ESTUDIANTE';
