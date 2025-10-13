import { describe, expect, it } from 'vitest';
import {
  computeSuspensions,
  suspendedFor,
  type CardEvent,
  type TeamFixture,
} from '@/lib/domain/discipline';

const rules = { yellowCardLimit: 3, yellowCardBan: 1, redCardBan: 2 };

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

const red = (matchId: string, playerId = 'p1'): CardEvent => ({
  matchId,
  playerId,
  teamId: 't',
  type: 'RED_CARD',
});

describe('computeSuspensions (red cards)', () => {
  it('bans for the following matches after a red card', () => {
    const [ban] = computeSuspensions(fixtures(6, 2), [red('m2')], rules);
    expect(ban).toMatchObject({
      reason: 'RED_CARD',
      triggeredByMatchId: 'm2',
      matchIds: ['m3', 'm4'],
      served: 0,
      remaining: 2,
    });
  });

  it('treats two yellows in one match as a sending-off', () => {
    const bans = computeSuspensions(fixtures(6, 1), [yellow('m1'), yellow('m1')], rules);
    expect(bans).toHaveLength(1);
    expect(bans[0].reason).toBe('RED_CARD');
  });

  it('does not count a double yellow towards the yellow card limit', () => {
    const cards = [yellow('m1'), yellow('m1'), yellow('m4'), yellow('m5')];
    const bans = computeSuspensions(fixtures(8, 5), cards, rules);
    expect(bans.map((b) => b.reason)).toEqual(['RED_CARD']);
  });

  it('starts a new ban after the one already running', () => {
    const cards = [red('m1'), red('m2')];
    const bans = computeSuspensions(fixtures(8, 2), cards, rules);
    expect(bans.map((b) => b.matchIds)).toEqual([
      ['m2', 'm3'],
      ['m4', 'm5'],
    ]);
  });

  it('lists fewer matches when the fixtures are not scheduled yet', () => {
    const [ban] = computeSuspensions(fixtures(3, 3), [red('m3')], rules);
    expect(ban.matchIds).toEqual([]);
    expect(ban.remaining).toBe(2);
  });

  it('ignores a ban length of zero', () => {
    expect(computeSuspensions(fixtures(3, 1), [red('m1')], { ...rules, redCardBan: 0 })).toEqual(
      [],
    );
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
