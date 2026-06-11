import type { Season } from '@prisma/client';
import type { DisciplineRules } from '@/lib/domain/discipline';
import type { StandingsRules, Tiebreaker } from '@/lib/domain/standings';

export function standingsRules(season: Season): StandingsRules {
  return {
    pointsForWin: season.pointsForWin,
    pointsForDraw: season.pointsForDraw,
    pointsForLoss: season.pointsForLoss,
    tiebreakers: season.tiebreakers as Tiebreaker[],
  };
}

export function disciplineRules(season: Season): DisciplineRules {
  return {
    yellowCardLimit: season.yellowCardLimit,
    yellowCardBan: season.yellowCardBan,
    redCardBan: season.redCardBan,
  };
}
