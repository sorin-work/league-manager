-- CreateIndex
CREATE INDEX "Match_status_kickoffAt_idx" ON "Match"("status", "kickoffAt");

-- CreateIndex
CREATE INDEX "Match_homeTeamId_idx" ON "Match"("homeTeamId");

-- CreateIndex
CREATE INDEX "Match_awayTeamId_idx" ON "Match"("awayTeamId");

