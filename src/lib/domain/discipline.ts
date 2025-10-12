export interface DisciplineRules {
  /** Yellow cards that trigger an automatic ban. */
  yellowCardLimit: number;
  /** Matches a player misses after reaching the yellow card limit. */
  yellowCardBan: number;
}

export const DEFAULT_DISCIPLINE: DisciplineRules = { yellowCardLimit: 5, yellowCardBan: 1 };

/** One fixture from the point of view of one team. */
export interface TeamFixture {
  matchId: string;
  teamId: string;
  /** Sort key: kick-off time in ms, or the round number when there is no date yet. */
  order: number;
  played: boolean;
}

export interface CardEvent {
  matchId: string;
  playerId: string;
  teamId: string;
  type: 'YELLOW_CARD' | 'RED_CARD';
}

export interface Suspension {
  playerId: string;
  teamId: string;
  reason: 'YELLOW_CARDS' | 'RED_CARD';
  triggeredByMatchId: string;
  /** Fixtures the player is banned from, as far as they are scheduled. */
  matchIds: string[];
  length: number;
  served: number;
  remaining: number;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

/**
 * Works out bans from the cards shown so far. Fixtures are walked in order for
 * each team; a ban covers the team's next fixtures after the match where it
 * was earned.
 */
export function computeSuspensions(
  fixtures: TeamFixture[],
  cards: CardEvent[],
  rules: DisciplineRules = DEFAULT_DISCIPLINE,
): Suspension[] {
  const suspensions: Suspension[] = [];
  const fixturesByTeam = groupBy(fixtures, (f) => f.teamId);
  const cardsByTeam = groupBy(cards, (c) => c.teamId);

  for (const [teamId, teamCards] of cardsByTeam) {
    const schedule = [...(fixturesByTeam.get(teamId) ?? [])].sort((a, b) => a.order - b.order);

    for (const [playerId, playerCards] of groupBy(teamCards, (c) => c.playerId)) {
      let yellows = 0;
      const byMatch = groupBy(playerCards, (c) => c.matchId);

      for (let i = 0; i < schedule.length; i++) {
        const inMatch = byMatch.get(schedule[i].matchId);
        if (!inMatch) continue;
        yellows += inMatch.filter((c) => c.type === 'YELLOW_CARD').length;
        if (yellows > rules.yellowCardLimit) {
          yellows -= rules.yellowCardLimit;
          const banned = schedule.slice(i + 1, i + 1 + rules.yellowCardBan);
          const served = banned.filter((f) => f.played).length;
          suspensions.push({
            playerId,
            teamId,
            reason: 'YELLOW_CARDS',
            triggeredByMatchId: schedule[i].matchId,
            matchIds: banned.map((f) => f.matchId),
            length: rules.yellowCardBan,
            served,
            remaining: rules.yellowCardBan - served,
          });
        }
      }
    }
  }

  return suspensions;
}

/** Players who may not play in the given match. */
export function suspendedFor(suspensions: Suspension[], matchId: string): Set<string> {
  return new Set(suspensions.filter((s) => s.matchIds.includes(matchId)).map((s) => s.playerId));
}
