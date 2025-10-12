import { describe, expect, it } from 'vitest';
import { topScorers, type EventType, type ScoringEvent } from '@/lib/domain/scorers';

const players: Record<string, [string, string]> = {
  p1: ['Ana Pop', 'Rovers'],
  p2: ['Ben Ivers', 'United'],
  p3: ['Cal Moss', 'Rovers'],
  p4: ['Dan Reed', 'United'],
};

const ev = (playerId: string, type: EventType = 'GOAL'): ScoringEvent => ({
  type,
  playerId,
  playerName: players[playerId][0],
  teamId: players[playerId][1].toLowerCase(),
  teamName: players[playerId][1],
});

describe('topScorers', () => {
  it('is empty without goals', () => {
    expect(topScorers([])).toEqual([]);
  });

  it('counts goals per player, most first', () => {
    const rows = topScorers([ev('p1'), ev('p2'), ev('p2'), ev('p3'), ev('p2')]);
    expect(rows.map((r) => [r.playerName, r.goals])).toEqual([
      ['Ben Ivers', 3],
      ['Ana Pop', 1],
      ['Cal Moss', 1],
    ]);
  });

  it('counts penalties as goals and reports them separately', () => {
    const [row] = topScorers([ev('p1'), ev('p1', 'PENALTY_GOAL')]);
    expect(row).toMatchObject({ goals: 2, penalties: 1 });
  });

  it('ignores cards', () => {
    const rows = topScorers([ev('p1', 'YELLOW_CARD'), ev('p2', 'RED_CARD'), ev('p3')]);
    expect(rows.map((r) => r.playerId)).toEqual(['p3']);
  });

  it('shares ranks between players on the same number of goals', () => {
    const rows = topScorers([ev('p1'), ev('p1'), ev('p2'), ev('p3'), ev('p4'), ev('p4')]);
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3, 3]);
  });

  it('limits the number of rows', () => {
    expect(topScorers([ev('p1'), ev('p2'), ev('p3')], 2)).toHaveLength(2);
  });

  it('keeps the team of the scorer', () => {
    expect(topScorers([ev('p2')])[0]).toMatchObject({ teamId: 'united', teamName: 'United' });
  });
});
