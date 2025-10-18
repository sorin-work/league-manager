-- CreateEnum
CREATE TYPE "FixtureFormat" AS ENUM ('SINGLE', 'DOUBLE');

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "pointsForWin" INTEGER NOT NULL DEFAULT 3,
    "pointsForDraw" INTEGER NOT NULL DEFAULT 1,
    "pointsForLoss" INTEGER NOT NULL DEFAULT 0,
    "tiebreakers" TEXT[] DEFAULT ARRAY['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD']::TEXT[],
    "yellowCardLimit" INTEGER NOT NULL DEFAULT 5,
    "yellowCardBan" INTEGER NOT NULL DEFAULT 1,
    "redCardBan" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "format" "FixtureFormat" NOT NULL DEFAULT 'SINGLE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_slug_key" ON "Season"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Division_seasonId_slug_key" ON "Division"("seasonId", "slug");

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

