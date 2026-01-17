import { describe, expect, it } from 'vitest';
import {
  computeStandings,
  type MatchResult,
  type StandingsRules,
  type Tiebreaker,
} from '@/lib/domain/standings';

const teams = [
  { id: 'a', name: 'Athletic' },
  { id: 'b', name: 'Borough' },
  { id: 'c', name: 'City' },
  { id: 'd', name: 'Dynamo' },
];

const r = (home: string, away: string, hs: number, as: number): MatchResult => ({
  homeTeamId: home,
  awayTeamId: away,
  homeScore: hs,
  awayScore: as,
});

const rules = (...tiebreakers: Tiebreaker[]): StandingsRules => ({
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,
  tiebreakers,
});

const order = (results: MatchResult[], tb: Tiebreaker[]) =>
  computeStandings(teams, results, rules(...tb)).map((row) => row.teamId);

describe('tiebreakers', () => {
  it('falls back to name order when no tiebreaker is configured', () => {
    // d and a both win 1-0; d has no advantage except the alphabet
    expect(order([r('d', 'b', 1, 0), r('a', 'c', 3, 0)], [])).toEqual(['a', 'd', 'b', 'c']);
  });

  it('breaks ties on goal difference', () => {
    expect(order([r('d', 'b', 3, 0), r('a', 'c', 1, 0)], ['GOAL_DIFFERENCE'])).toEqual([
      'd',
      'a',
      'c',
      'b',
    ]);
  });

  it('breaks ties on goals scored', () => {
    const results = [r('d', 'b', 4, 2), r('a', 'c', 2, 0)];
    expect(order(results, ['GOALS_FOR'])).toEqual(['d', 'a', 'b', 'c']);
  });

  it('applies tiebreakers in the configured order', () => {
    // a: +2 (2-0), d: +2 (4-2). Goal difference is level, goals scored is not.
    const results = [r('d', 'b', 4, 2), r('a', 'c', 2, 0)];
    expect(order(results, ['GOAL_DIFFERENCE', 'GOALS_FOR']).slice(0, 2)).toEqual(['d', 'a']);
    expect(order(results, ['GOAL_DIFFERENCE']).slice(0, 2)).toEqual(['a', 'd']);
  });

  it('breaks ties on number of wins', () => {
    // two points for a win: a (win + loss) and b (two draws) both have 2
    const results = [r('a', 'c', 1, 0), r('d', 'a', 1, 0), r('b', 'c', 0, 0), r('b', 'd', 1, 1)];
    const table = computeStandings(teams, results, { ...rules('WINS'), pointsForWin: 2 });
    const a = table.findIndex((row) => row.teamId === 'a');
    const b = table.findIndex((row) => row.teamId === 'b');
    expect(a).toBeLessThan(b);
  });

  it('uses head-to-head results between the tied teams', () => {
    // a and b on 3 points each; a won the meeting and also has the better goal difference
    const results = [r('a', 'b', 3, 0), r('b', 'c', 1, 0), r('d', 'a', 1, 0)];
    const table = computeStandings(teams, results, rules('HEAD_TO_HEAD'));
    expect(table.findIndex((row) => row.teamId === 'a')).toBeLessThan(
      table.findIndex((row) => row.teamId === 'b'),
    );
  });

  it('ranks the winner of the meeting first even with a worse goal difference', () => {
    // a and b both on 3 points. b has the better goal difference overall,
    // but a won the game between them.
    const results = [r('a', 'b', 1, 0), r('b', 'c', 5, 0), r('d', 'a', 3, 0), r('c', 'd', 0, 0)];
    const table = computeStandings(teams, results, rules('HEAD_TO_HEAD', 'GOAL_DIFFERENCE'));
    const ids = table.map((row) => row.teamId);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
  });

  it('falls through to the next tiebreaker when head-to-head is level', () => {
    // a, b and c all on 3 points from a cycle of 1-0 wins
    const results = [r('a', 'b', 1, 0), r('b', 'c', 1, 0), r('c', 'a', 1, 0)];
    const table = computeStandings(teams, results, rules('HEAD_TO_HEAD', 'GOALS_FOR'));
    expect(table.slice(0, 3).map((row) => row.teamId)).toEqual(['a', 'b', 'c']);
  });

  it('assigns consecutive positions after tiebreaks', () => {
    const table = computeStandings(teams, [r('a', 'b', 1, 1), r('c', 'd', 1, 1)], rules());
    expect(table.map((row) => row.position)).toEqual([1, 2, 3, 4]);
  });
});
