import { describe, expect, it } from 'vitest';
import { computeStandings, type MatchResult } from '@/lib/domain/standings';

const teams = [
  { id: 'a', name: 'Athletic' },
  { id: 'b', name: 'Borough' },
  { id: 'c', name: 'City' },
  { id: 'd', name: 'Dynamo' },
];

const result = (home: string, away: string, hs: number, as: number): MatchResult => ({
  homeTeamId: home,
  awayTeamId: away,
  homeScore: hs,
  awayScore: as,
});

describe('computeStandings', () => {
  it('lists every team with zeros before any match is played', () => {
    const table = computeStandings(teams, []);
    expect(table).toHaveLength(4);
    expect(table.every((r) => r.played === 0 && r.points === 0)).toBe(true);
  });

  it('orders an empty table alphabetically', () => {
    expect(computeStandings(teams, []).map((r) => r.name)).toEqual([
      'Athletic',
      'Borough',
      'City',
      'Dynamo',
    ]);
  });

  it('awards three points for a win and one for a draw by default', () => {
    const table = computeStandings(teams, [result('a', 'b', 2, 0), result('c', 'd', 1, 1)]);
    const byId = Object.fromEntries(table.map((r) => [r.teamId, r]));
    expect(byId.a).toMatchObject({ played: 1, won: 1, points: 3, goalsFor: 2, goalsAgainst: 0 });
    expect(byId.b).toMatchObject({ played: 1, lost: 1, points: 0, goalDifference: -2 });
    expect(byId.c).toMatchObject({ drawn: 1, points: 1 });
    expect(byId.d).toMatchObject({ drawn: 1, points: 1 });
  });

  it('uses custom points rules', () => {
    const rules = { pointsForWin: 2, pointsForDraw: 1, pointsForLoss: 0 };
    const table = computeStandings(teams, [result('a', 'b', 1, 0)], rules);
    expect(table[0]).toMatchObject({ teamId: 'a', points: 2 });
  });

  it('can award points for a loss', () => {
    const rules = { pointsForWin: 3, pointsForDraw: 2, pointsForLoss: 1 };
    const table = computeStandings(teams, [result('a', 'b', 1, 0)], rules);
    expect(table.find((r) => r.teamId === 'b')?.points).toBe(1);
  });

  it('sorts by points, then goal difference', () => {
    const table = computeStandings(teams, [
      result('a', 'b', 1, 0),
      result('c', 'd', 4, 0),
      result('b', 'd', 2, 2),
    ]);
    expect(table.map((r) => r.teamId)).toEqual(['c', 'a', 'b', 'd']);
    expect(table.map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });

  it('accumulates over several matches', () => {
    const table = computeStandings(teams, [
      result('a', 'b', 3, 1),
      result('b', 'a', 2, 2),
      result('a', 'c', 0, 1),
    ]);
    const a = table.find((r) => r.teamId === 'a');
    expect(a).toMatchObject({ played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 5, goalsAgainst: 4 });
    expect(a?.points).toBe(4);
  });

  it('ignores results for teams that are not in the division', () => {
    const table = computeStandings(teams, [result('a', 'zz', 5, 0)]);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });
});
