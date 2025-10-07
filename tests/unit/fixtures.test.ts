import { describe, expect, it } from 'vitest';
import { FixtureError, generateFixtures, roundRobin } from '@/lib/domain/fixtures';

const teams = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|');
}

describe('roundRobin', () => {
  it('rejects fewer than two teams', () => {
    expect(() => roundRobin(['t1'])).toThrow(FixtureError);
    expect(() => roundRobin([])).toThrow(FixtureError);
  });

  it('rejects duplicate teams', () => {
    expect(() => roundRobin(['t1', 't2', 't1'])).toThrow(/twice/);
  });

  it('makes n-1 rounds of n/2 matches for an even number of teams', () => {
    const rounds = roundRobin(teams(6));
    expect(rounds).toHaveLength(5);
    for (const round of rounds) {
      expect(round.matches).toHaveLength(3);
      expect(round.bye).toBeNull();
    }
  });

  it('numbers rounds from 1', () => {
    expect(roundRobin(teams(4)).map((r) => r.round)).toEqual([1, 2, 3]);
  });

  it.each([2, 3, 4, 5, 6, 7, 8, 9, 10, 16])('pairs every team exactly once (%i teams)', (n) => {
    const seen = new Map<string, number>();
    for (const round of roundRobin(teams(n))) {
      for (const m of round.matches) {
        const key = pairKey(m.home, m.away);
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    }
    expect(seen.size).toBe((n * (n - 1)) / 2);
    expect([...seen.values()].every((count) => count === 1)).toBe(true);
  });

  it('never schedules a team twice in the same round', () => {
    for (const round of roundRobin(teams(9))) {
      const playing = round.matches.flatMap((m) => [m.home, m.away]);
      expect(new Set(playing).size).toBe(playing.length);
    }
  });

  it('gives every team exactly one bye with an odd number of teams', () => {
    const rounds = roundRobin(teams(7));
    expect(rounds).toHaveLength(7);
    const byes = rounds.map((r) => r.bye);
    expect(byes.every((b) => b !== null)).toBe(true);
    expect(new Set(byes).size).toBe(7);
    for (const round of rounds) expect(round.matches).toHaveLength(3);
  });

  it('does not schedule the team that has the bye', () => {
    for (const round of roundRobin(teams(5))) {
      const playing = round.matches.flatMap((m) => [m.home, m.away]);
      expect(playing).not.toContain(round.bye);
    }
  });
});

describe('generateFixtures', () => {
  it('returns the single round-robin by default', () => {
    expect(generateFixtures(teams(4))).toEqual(roundRobin(teams(4)));
  });

  it('doubles the number of rounds for a double round-robin', () => {
    const rounds = generateFixtures(teams(6), 'DOUBLE');
    expect(rounds).toHaveLength(10);
    expect(rounds.map((r) => r.round)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('plays every ordered pairing once in a double round-robin', () => {
    const seen = new Set<string>();
    for (const round of generateFixtures(teams(5), 'DOUBLE')) {
      for (const m of round.matches) {
        const key = `${m.home}>${m.away}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(5 * 4);
  });

  it('keeps the same byes in the second leg', () => {
    const rounds = generateFixtures(teams(5), 'DOUBLE');
    expect(rounds.slice(5).map((r) => r.bye)).toEqual(rounds.slice(0, 5).map((r) => r.bye));
  });
});
