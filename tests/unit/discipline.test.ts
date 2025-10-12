import { describe, expect, it } from 'vitest';
import {
  computeSuspensions,
  suspendedFor,
  type CardEvent,
  type TeamFixture,
} from '@/lib/domain/discipline';

const rules = { yellowCardLimit: 3, yellowCardBan: 1 };

/** Team "t" plays matches m1..mN in order; the first `played` are finished. */
function fixtures(n: number, played: number): TeamFixture[] {
  return Array.from({ length: n }, (_, i) => ({
    matchId: `m${i + 1}`,
    teamId: 't',
    order: i + 1,
    played: i < played,
  }));
}

const yellow = (matchId: string, playerId = 'p1'): CardEvent => ({
  matchId,
  playerId,
  teamId: 't',
  type: 'YELLOW_CARD',
});

describe('computeSuspensions (yellow cards)', () => {
  it('returns nothing without cards', () => {
    expect(computeSuspensions(fixtures(5, 2), [], rules)).toEqual([]);
  });

  it('does not ban a player below the limit', () => {
    const cards = [yellow('m1'), yellow('m2')];
    expect(computeSuspensions(fixtures(5, 2), cards, rules)).toEqual([]);
  });

  it('bans for the configured number of matches', () => {
    const cards = [yellow('m1'), yellow('m2'), yellow('m3'), yellow('m4')];
    const [ban] = computeSuspensions(fixtures(8, 4), cards, { ...rules, yellowCardBan: 2 });
    expect(ban.reason).toBe('YELLOW_CARDS');
    expect(ban.matchIds).toHaveLength(2);
    expect(ban.length).toBe(2);
  });

  it('counts served and remaining matches of a ban', () => {
    const cards = [yellow('m1'), yellow('m2'), yellow('m3'), yellow('m4')];
    const [ban] = computeSuspensions(fixtures(8, 8), cards, rules);
    expect(ban.served).toBe(1);
    expect(ban.remaining).toBe(0);
  });

  it('keeps players apart', () => {
    const cards = [yellow('m1', 'p1'), yellow('m2', 'p2'), yellow('m3', 'p1')];
    expect(computeSuspensions(fixtures(5, 3), cards, rules)).toEqual([]);
  });

  it('handles cards for fixtures given out of order', () => {
    const shuffled = fixtures(6, 5).reverse();
    const cards = [yellow('m4'), yellow('m1'), yellow('m3'), yellow('m2')];
    const bans = computeSuspensions(shuffled, cards, rules);
    expect(bans).toHaveLength(1);
  });
});

describe('suspendedFor', () => {
  it('lists players banned from a match', () => {
    const cards = [yellow('m1'), yellow('m2'), yellow('m3'), yellow('m4')];
    const bans = computeSuspensions(fixtures(8, 4), cards, { ...rules, yellowCardBan: 4 });
    const banned = bans[0].matchIds;
    expect(suspendedFor(bans, banned[0])).toEqual(new Set(['p1']));
    expect(suspendedFor(bans, 'm1').size).toBe(0);
  });
});
