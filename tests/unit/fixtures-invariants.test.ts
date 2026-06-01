import { describe, expect, it } from 'vitest';
import { generateFixtures, shuffle, type FixtureFormat } from '@/lib/domain/fixtures';
import { scheduleFixtures } from '@/lib/domain/schedule';

const teams = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);
const cases: [number, FixtureFormat][] = [];
for (let n = 2; n <= 20; n++) cases.push([n, 'SINGLE'], [n, 'DOUBLE']);

describe.each(cases)('%i teams, %s round-robin', (n, format) => {
  const rounds = generateFixtures(teams(n), format);
  const legs = format === 'DOUBLE' ? 2 : 1;

  it('has the expected number of rounds and matches', () => {
    const perLeg = n % 2 === 0 ? n - 1 : n;
    expect(rounds).toHaveLength(perLeg * legs);
    expect(rounds.flatMap((r) => r.matches)).toHaveLength(((n * (n - 1)) / 2) * legs);
  });

  it('plays every team at most once per round', () => {
    for (const r of rounds) {
      const playing = r.matches.flatMap((m) => [m.home, m.away]);
      expect(new Set(playing).size).toBe(playing.length);
    }
  });

  it('balances home games within one', () => {
    const home = new Map<string, number>();
    for (const m of rounds.flatMap((r) => r.matches)) home.set(m.home, (home.get(m.home) ?? 0) + 1);
    const counts = teams(n).map((t) => home.get(t) ?? 0);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});

describe('scheduling a shuffled draw', () => {
  it('still gives every team a match day in every round it plays', () => {
    const rounds = generateFixtures(shuffle(teams(9), 99), 'DOUBLE');
    const matches = scheduleFixtures(rounds, {
      startDate: '2025-09-07',
      daysBetweenRounds: 7,
      kickoffTimes: ['10:00', '12:00'],
      timeZone: 'Europe/London',
    });
    const days = new Set(matches.map((m) => m.kickoffAt.toISOString().slice(0, 10)));
    expect(days.size).toBe(rounds.length);
  });
});
