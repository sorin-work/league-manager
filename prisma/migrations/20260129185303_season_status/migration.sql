-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FINISHED');

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "status" "SeasonStatus" NOT NULL DEFAULT 'ACTIVE';

