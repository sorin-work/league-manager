-- CreateEnum
CREATE TYPE "Position" AS ENUM ('GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "position" "Position";

