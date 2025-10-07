export type TeamId = string;

export interface Pairing {
  home: TeamId;
  away: TeamId;
}

export interface Round {
  round: number;
  matches: Pairing[];
  /** Team that sits this round out when the division has an odd number of teams. */
  bye: TeamId | null;
}

export class FixtureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FixtureError';
  }
}

/**
 * Single round-robin schedule using the circle method: one slot stays fixed and
 * the others rotate one place per round, so every team meets every other team
 * exactly once. With an odd number of teams a "bye" slot is added and whoever
 * is drawn against it rests that round.
 */
export function roundRobin(teamIds: TeamId[]): Round[] {
  if (teamIds.length < 2) throw new FixtureError('At least two teams are needed to make fixtures');
  if (new Set(teamIds).size !== teamIds.length) throw new FixtureError('A team appears twice');

  const slots: (TeamId | null)[] = [...teamIds];
  if (slots.length % 2 === 1) slots.unshift(null);

  const n = slots.length;
  const fixed = slots[0];
  let rotating = slots.slice(1);
  const rounds: Round[] = [];

  for (let r = 0; r < n - 1; r++) {
    const lineup = [fixed, ...rotating];
    const matches: Pairing[] = [];
    let bye: TeamId | null = null;

    for (let i = 0; i < n / 2; i++) {
      const a = lineup[i];
      const b = lineup[n - 1 - i];
      if (a === null || b === null) {
        bye = a ?? b;
        continue;
      }
      // Alternate home and away down the table so teams don't get long runs.
      const swap = i % 2 === 1;
      matches.push(swap ? { home: b, away: a } : { home: a, away: b });
    }

    rounds.push({ round: r + 1, matches, bye });
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  return rounds;
}

export type FixtureFormat = 'SINGLE' | 'DOUBLE';

/**
 * Builds the full fixture list. A double round-robin plays the first leg again
 * with home and away reversed, so every pair meets once at each ground.
 */
export function generateFixtures(teamIds: TeamId[], format: FixtureFormat = 'SINGLE'): Round[] {
  const firstLeg = roundRobin(teamIds);
  if (format === 'SINGLE') return firstLeg;

  const secondLeg = firstLeg.map((round) => ({
    round: round.round + firstLeg.length,
    matches: round.matches.map((m) => ({ home: m.away, away: m.home })),
    bye: round.bye,
  }));
  return [...firstLeg, ...secondLeg];
}
