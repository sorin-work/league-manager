import { describe, expect, it } from 'vitest';
import { FixtureError, generateFixtures } from '@/lib/domain/fixtures';
import { addDays, scheduleFixtures } from '@/lib/domain/schedule';

const teams = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);
const day = (d: Date) => d.toISOString().slice(0, 10);

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2025-12-27', 7)).toBe('2026-01-03');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('scheduleFixtures', () => {
  const base = { startDate: '2025-09-06', daysBetweenRounds: 7, kickoffTimes: ['10:00'] };

  it('keeps every match from the rounds', () => {
    const rounds = generateFixtures(teams(6), 'DOUBLE');
    expect(scheduleFixtures(rounds, base)).toHaveLength(30);
  });

  it('puts each round a week after the previous one', () => {
    const matches = scheduleFixtures(generateFixtures(teams(4)), base);
    const dates = [...new Set(matches.map((m) => day(m.kickoffAt)))];
    expect(dates).toEqual(['2025-09-06', '2025-09-13', '2025-09-20']);
  });

  it('supports other gaps between rounds', () => {
    const matches = scheduleFixtures(generateFixtures(teams(4)), {
      ...base,
      daysBetweenRounds: 14,
    });
    expect(day(matches.at(-1)!.kickoffAt)).toBe('2025-10-04');
  });

  it('skips blocked dates and carries on from there', () => {
    const matches = scheduleFixtures(generateFixtures(teams(4)), {
      ...base,
      skipDates: ['2025-09-13'],
    });
    const dates = [...new Set(matches.map((m) => day(m.kickoffAt)))];
    expect(dates).toEqual(['2025-09-06', '2025-09-20', '2025-09-27']);
  });

  it('spreads matches over the kick-off slots', () => {
    const matches = scheduleFixtures(generateFixtures(teams(6)), {
      ...base,
      kickoffTimes: ['10:00', '12:00'],
    });
    const round1 = matches.filter((m) => m.round === 1);
    expect(round1.map((m) => m.kickoffAt.toISOString().slice(11, 16))).toEqual([
      '10:00',
      '12:00',
      '10:00',
    ]);
  });

  it('never puts two matches at the same venue and time', () => {
    const matches = scheduleFixtures(generateFixtures(teams(8)), {
      ...base,
      kickoffTimes: ['10:00', '12:00'],
      venueIds: ['v1', 'v2'],
    });
    const slots = matches.map((m) => `${m.kickoffAt.toISOString()}@${m.venueId}`);
    expect(new Set(slots).size).toBe(slots.length);
  });

  it("uses the home team's own ground when it has one", () => {
    const matches = scheduleFixtures(generateFixtures(teams(4)), {
      ...base,
      venueIds: ['shared'],
      homeVenues: { t1: 'home-of-t1' },
    });
    for (const m of matches) {
      expect(m.venueId).toBe(m.homeTeamId === 't1' ? 'home-of-t1' : 'shared');
    }
  });

  it('treats kick-off times as local time in the given time zone', () => {
    const [summer] = scheduleFixtures(generateFixtures(teams(2)), {
      ...base,
      timeZone: 'Europe/London',
    });
    expect(summer.kickoffAt.toISOString()).toBe('2025-09-06T09:00:00.000Z');

    const [winter] = scheduleFixtures(generateFixtures(teams(2)), {
      ...base,
      startDate: '2025-11-08',
      timeZone: 'Europe/London',
    });
    expect(winter.kickoffAt.toISOString()).toBe('2025-11-08T10:00:00.000Z');
  });

  it('keeps the local kick-off time across a clock change', () => {
    const matches = scheduleFixtures(generateFixtures(teams(4)), {
      ...base,
      startDate: '2025-10-19',
      timeZone: 'Europe/Berlin',
    });
    const hours = matches.map((m) => m.kickoffAt.toISOString().slice(11, 16));
    // 10:00 CEST is 08:00Z, 10:00 CET is 09:00Z
    expect(hours).toEqual(['08:00', '08:00', '09:00', '09:00', '09:00', '09:00']);
  });

  it('leaves the venue empty when there are none', () => {
    const [m] = scheduleFixtures(generateFixtures(teams(2)), base);
    expect(m.venueId).toBeNull();
  });

  it('validates its options', () => {
    const rounds = generateFixtures(teams(4));
    expect(() => scheduleFixtures(rounds, { ...base, kickoffTimes: [] })).toThrow(FixtureError);
    expect(() => scheduleFixtures(rounds, { ...base, kickoffTimes: ['25:00'] })).toThrow(/HH:MM/);
    expect(() => scheduleFixtures(rounds, { ...base, daysBetweenRounds: 0 })).toThrow(FixtureError);
    expect(() => scheduleFixtures(rounds, { ...base, startDate: '6/9/2025' })).toThrow(
      FixtureError,
    );
  });
});
