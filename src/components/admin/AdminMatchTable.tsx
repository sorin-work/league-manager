import Link from 'next/link';
import { formatKickoff } from '@/lib/domain/time';
import type { MatchWithTeams } from '@/lib/server/services/matches';

const STATUS: Record<string, string> = {
  SCHEDULED: '',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
};

export function AdminMatchTable({
  matches,
  timeZone,
}: {
  matches: MatchWithTeams[];
  timeZone: string;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="num">Rd</th>
            <th>Kick-off</th>
            <th>Match</th>
            <th>Venue</th>
            <th className="num">Result</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id}>
              <td className="num">{m.round}</td>
              <td className="small">{formatKickoff(m.kickoffAt, timeZone)}</td>
              <td>
                {m.homeTeam.name} v {m.awayTeam.name}
              </td>
              <td className="muted small">{m.venue?.name ?? ''}</td>
              <td className="num">
                {m.status === 'PLAYED' ? (
                  <strong>
                    {m.homeScore} – {m.awayScore}
                  </strong>
                ) : (
                  <span className="muted small">{STATUS[m.status]}</span>
                )}
              </td>
              <td className="num">
                <Link href={`/admin/matches/${m.id}`}>Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
