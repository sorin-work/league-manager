import { FixtureError, type Round, type TeamId } from './fixtures';
import { zonedTimeToUtc } from './time';

export interface ScheduleOptions {
  /** Match day of round 1, YYYY-MM-DD. */
  startDate: string;
  /** Days between consecutive rounds, 7 for a weekly league. */
  daysBetweenRounds: number;
  /** Kick-off slots on a match day ("HH:MM"). Matches are spread over them in order. */
  kickoffTimes: string[];
  /** Venues used for matches whose home team has no ground of its own. */
  venueIds?: string[];
  /** Ground of each team, if it has one. */
  homeVenues?: Record<TeamId, string | null | undefined>;
  /** Match days to skip (holidays, cup weekends). The round moves to the next free date. */
  skipDates?: string[];
  /** Time zone the kick-off times are meant in. Defaults to UTC. */
  timeZone?: string;
}

export interface ScheduledMatch {
  round: number;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  kickoffAt: Date;
  venueId: string | null;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Puts dates, kick-off times and venues on generated rounds. */
export function scheduleFixtures(rounds: Round[], options: ScheduleOptions): ScheduledMatch[] {
  const { startDate, daysBetweenRounds, kickoffTimes } = options;
  if (!DATE.test(startDate)) throw new FixtureError('Start date must be YYYY-MM-DD');
  if (!Number.isInteger(daysBetweenRounds) || daysBetweenRounds < 1) {
    throw new FixtureError('There must be at least one day between rounds');
  }
  if (kickoffTimes.length === 0) throw new FixtureError('Give at least one kick-off time');
  for (const t of kickoffTimes) {
    if (!TIME.test(t)) throw new FixtureError(`Kick-off time ${t} must be HH:MM`);
  }

  const venues = options.venueIds ?? [];
  const skip = new Set(options.skipDates ?? []);
  const result: ScheduledMatch[] = [];
  let date = startDate;

  for (const round of rounds) {
    while (skip.has(date)) date = addDays(date, daysBetweenRounds);

    round.matches.forEach((match, i) => {
      const time = kickoffTimes[i % kickoffTimes.length];
      // each slot can use every venue once, so move to the next venue per full set of slots
      const sharedVenue =
        venues.length > 0 ? venues[Math.floor(i / kickoffTimes.length) % venues.length] : null;
      result.push({
        round: round.round,
        homeTeamId: match.home,
        awayTeamId: match.away,
        kickoffAt: zonedTimeToUtc(`${date}T${time}`, options.timeZone ?? 'UTC'),
        venueId: options.homeVenues?.[match.home] ?? sharedVenue,
      });
    });

    date = addDays(date, daysBetweenRounds);
  }

  return result;
}
