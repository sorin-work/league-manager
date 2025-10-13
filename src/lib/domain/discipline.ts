export interface DisciplineRules {
  /** Yellow cards that trigger an automatic ban. */
  yellowCardLimit: number;
  /** Matches a player misses after reaching the yellow card limit. */
  yellowCardBan: number;
  /** Matches a player misses after a red card (or two yellows in one match). */
  redCardBan: number;
}

export const DEFAULT_DISCIPLINE: DisciplineRules = {
  yellowCardLimit: 5,
  yellowCardBan: 1,
  redCardBan: 1,
};

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

export type SuspensionReason = 'YELLOW_CARDS' | 'RED_CARD';

export interface Suspension {
  playerId: string;
  teamId: string;
  reason: SuspensionReason;
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
 * was earned. A ban earned while another one is still running starts after it.
 *
 * Two yellow cards in the same match count as a sending-off: they lead to a
 * red card ban and do not count towards the yellow card limit.
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
      // index of the first fixture not already covered by an earlier ban
      let nextFree = 0;
      const byMatch = groupBy(playerCards, (c) => c.matchId);

      const ban = (i: number, reason: SuspensionReason, length: number) => {
        if (length <= 0) return;
        const start = Math.max(i + 1, nextFree);
        const banned = schedule.slice(start, start + length);
        nextFree = start + length;
        const served = banned.filter((f) => f.played).length;
        suspensions.push({
          playerId,
          teamId,
          reason,
          triggeredByMatchId: schedule[i].matchId,
          matchIds: banned.map((f) => f.matchId),
          length,
          served,
          remaining: length - served,
        });
      };

      for (let i = 0; i < schedule.length; i++) {
        const inMatch = byMatch.get(schedule[i].matchId);
        if (!inMatch) continue;
        const y = inMatch.filter((c) => c.type === 'YELLOW_CARD').length;
        const red = inMatch.some((c) => c.type === 'RED_CARD');

        if (red || y >= 2) {
          ban(i, 'RED_CARD', rules.redCardBan);
          continue;
        }
        yellows += y;
        if (yellows > rules.yellowCardLimit) {
          yellows -= rules.yellowCardLimit;
          ban(i, 'YELLOW_CARDS', rules.yellowCardBan);
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

/** Bans that still have matches left to serve. */
export function activeSuspensions(suspensions: Suspension[]): Suspension[] {
  return suspensions.filter((s) => s.remaining > 0);
}
