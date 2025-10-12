export const EVENT_TYPES = ['GOAL', 'PENALTY_GOAL', 'OWN_GOAL', 'YELLOW_CARD', 'RED_CARD'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const CARD_TYPES: EventType[] = ['YELLOW_CARD', 'RED_CARD'];

export interface ScoringEvent {
  type: EventType;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
}

export interface ScorerRow {
  rank: number;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  goals: number;
  penalties: number;
}

/**
 * Goal-scorer chart. Players level on goals share a rank ("1, 2, 2, 4") and
 * are listed by name.
 */
export function topScorers(events: ScoringEvent[], limit = 20): ScorerRow[] {
  const rows = new Map<string, ScorerRow>();

  for (const e of events) {
    if (CARD_TYPES.includes(e.type)) continue;
    let row = rows.get(e.playerId);
    if (!row) {
      row = {
        rank: 0,
        playerId: e.playerId,
        playerName: e.playerName,
        teamId: e.teamId,
        teamName: e.teamName,
        goals: 0,
        penalties: 0,
      };
      rows.set(e.playerId, row);
    }
    row.goals += 1;
    if (e.type === 'PENALTY_GOAL') row.penalties += 1;
  }

  const sorted = [...rows.values()].sort(
    (a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName),
  );
  sorted.forEach((row, i) => {
    row.rank = i > 0 && sorted[i - 1].goals === row.goals ? sorted[i - 1].rank : i + 1;
  });
  return sorted.slice(0, limit);
}
