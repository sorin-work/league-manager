import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDay } from '@/lib/format';
import { formatTime } from '@/lib/domain/time';
import { getMatchday } from '@/lib/server/services/matchday';

export const metadata: Metadata = { title: 'Match day' };

type Props = { searchParams: Promise<{ date?: string }> };

const today = () => new Date().toISOString().slice(0, 10);

export default async function MatchdayPage({ searchParams }: Props) {
  const { date: param } = await searchParams;
  const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : today();
  const { matches, previous, next } = await getMatchday(date);

  const divisions = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = `${m.division.season.name} · ${m.division.name}`;
    divisions.set(key, [...(divisions.get(key) ?? []), m]);
  }

  return (
    <div className="container">
      <h1>Matches on {formatDay(date)}</h1>
      <nav className="pagination">
        {previous ? (
          <Link href={`/fixtures?date=${previous}`}>← {formatDay(previous)}</Link>
        ) : (
          <span />
        )}
        {next ? <Link href={`/fixtures?date=${next}`}>{formatDay(next)} →</Link> : <span />}
      </nav>

      {matches.length === 0 ? (
        <div className="card empty">No matches on this day.</div>
      ) : (
        [...divisions].map(([name, list]) => (
          <section key={name} className="card">
            <h2>{name}</h2>
            <ul className="upcoming">
              {list.map((m) => (
                <li key={m.id}>
                  <span className="muted small">
                    {m.kickoffAt ? formatTime(m.kickoffAt, m.division.season.timezone) : ''}
                  </span>
                  <Link href={`/matches/${m.id}`}>
                    {m.status === 'PLAYED'
                      ? `${m.homeTeam.name} ${m.homeScore} – ${m.awayScore} ${m.awayTeam.name}`
                      : `${m.homeTeam.name} v ${m.awayTeam.name}`}
                  </Link>
                  <span className="muted small">
                    {m.status === 'POSTPONED' ? 'Postponed' : (m.venue?.name ?? '')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
