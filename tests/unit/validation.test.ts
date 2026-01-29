import { describe, expect, it } from 'vitest';
import { seasonSchema, seasonUpdateSchema } from '@/lib/validation';

const valid = { name: 'Autumn 2025', startDate: '2025-09-01', endDate: '2025-12-20' };

describe('seasonSchema', () => {
  it('fills in the default rules', () => {
    expect(seasonSchema.parse(valid)).toEqual({
      ...valid,
      timezone: 'Europe/London',
      pointsForWin: 3,
      pointsForDraw: 1,
      pointsForLoss: 0,
      tiebreakers: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
      yellowCardLimit: 5,
      yellowCardBan: 1,
      redCardBan: 1,
      status: 'DRAFT',
    });
  });

  it('trims the name and rejects an empty one', () => {
    expect(seasonSchema.parse({ ...valid, name: '  Spring  ' }).name).toBe('Spring');
    expect(seasonSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('rejects an end date before the start date', () => {
    const res = seasonSchema.safeParse({ ...valid, endDate: '2025-08-01' });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].path).toEqual(['endDate']);
  });

  it('rejects malformed dates', () => {
    expect(seasonSchema.safeParse({ ...valid, startDate: '01/09/2025' }).success).toBe(false);
  });

  it('rejects unknown time zones', () => {
    expect(seasonSchema.safeParse({ ...valid, timezone: 'Mars/Olympus' }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...valid, timezone: 'America/Chicago' }).success).toBe(true);
  });

  it('rejects repeated or unknown tiebreakers', () => {
    const twice = { ...valid, tiebreakers: ['GOALS_FOR', 'GOALS_FOR'] };
    expect(seasonSchema.safeParse(twice).success).toBe(false);
    expect(seasonSchema.safeParse({ ...valid, tiebreakers: ['COIN_TOSS'] }).success).toBe(false);
  });

  it('only accepts whole, non-negative points', () => {
    expect(seasonSchema.safeParse({ ...valid, pointsForWin: 2.5 }).success).toBe(false);
    expect(seasonSchema.safeParse({ ...valid, pointsForLoss: -1 }).success).toBe(false);
  });

  it('needs a yellow card limit of at least one', () => {
    expect(seasonSchema.safeParse({ ...valid, yellowCardLimit: 0 }).success).toBe(false);
  });
});

describe('seasonUpdateSchema', () => {
  it('accepts partial updates without filling defaults for missing fields', () => {
    expect(seasonUpdateSchema.parse({ pointsForWin: 2 })).toEqual({ pointsForWin: 2 });
  });
});
