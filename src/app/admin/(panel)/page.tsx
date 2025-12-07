import Link from 'next/link';
import { formatKickoff } from '@/lib/domain/time';
import { getDashboard } from '@/lib/server/services/dashboard';

export default async function AdminHome() {
  const { counts, overdue } = await getDashboard();

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats card">
        <div className="stat">
          <strong>{counts.seasons}</strong>
          <span className="muted small">Seasons</span>
        </div>
        <div className="stat">
          <strong>{counts.teams}</strong>
          <span className="muted small">Teams</span>
        </div>
        <div className="stat">
          <strong>{counts.played}</strong>
          <span className="muted small">Matches played</span>
        </div>
        <div className="stat">
          <strong>{counts.remaining}</strong>
          <span className="muted small">Still to play</span>
        </div>
      </div>

      <section className="card">
        <h2>Results to enter</h2>
        {overdue.length === 0 ? (
          <p className="muted">All caught up: every match that has kicked off has a result.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <tbody>
                {overdue.map((m) => (
                  <tr key={m.id}>
                    <td className="muted small">
                      {formatKickoff(m.kickoffAt, m.division.season.timezone)}
                    </td>
                    <td>{m.division.name}</td>
                    <td>
                      {m.homeTeam.name} v {m.awayTeam.name}
                    </td>
                    <td className="num">
                      <Link href={`/admin/matches/${m.id}`}>Enter result</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {counts.seasons === 0 && (
        <section className="card">
          <h2>Getting started</h2>
          <p>
            Create a <Link href="/admin/seasons">season</Link>, add divisions and teams, then
            generate the fixtures.
          </p>
        </section>
      )}
    </>
  );
}
