import Link from 'next/link';
import { formatKickoff } from '@/lib/domain/time';
import { statusNote } from '@/lib/match-status';
import type { MatchWithTeams } from '@/lib/server/services/matches';

interface Props {
  matches: MatchWithTeams[];
  timeZone: string;
  /** Show the latest round first (results) instead of the earliest (fixtures). */
  newestFirst?: boolean;
  /** Team resting in each round, by round number. */
  byes?: Record<number, string>;
  emptyText: string;
}

export function MatchList({ matches, timeZone, newestFirst = false, byes, emptyText }: Props) {
  if (matches.length === 0) return <div className="empty">{emptyText}</div>;

  const rounds = new Map<number, MatchWithTeams[]>();
  for (const m of matches) rounds.set(m.round, [...(rounds.get(m.round) ?? []), m]);
  const order = [...rounds.keys()].sort((a, b) => (newestFirst ? b - a : a - b));

  return (
    <div className="match-list">
      {order.map((round) => (
        <section key={round}>
          <h3>Round {round}</h3>
          <ul>
            {rounds.get(round)!.map((m) => (
              <li key={m.id} className="match-row">
                <span className="when muted small">
                  {statusNote(m.status) ?? formatKickoff(m.kickoffAt, timeZone)}
                </span>
                <span className="home">{m.homeTeam.name}</span>
                <Link href={`/matches/${m.id}`} className="score">
                  {m.status === 'PLAYED' ? `${m.homeScore} – ${m.awayScore}` : 'v'}
                  {m.walkover && <abbr title="Walkover"> w/o</abbr>}
                </Link>
                <span className="away">{m.awayTeam.name}</span>
                <span className="venue muted small">{m.venue?.name ?? ''}</span>
              </li>
            ))}
          </ul>
          {byes?.[round] && <p className="muted small">Bye: {byes[round]}</p>}
        </section>
      ))}
    </div>
  );
}
