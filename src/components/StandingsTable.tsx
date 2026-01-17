import Link from 'next/link';
import type { FormResult, StandingRow } from '@/lib/domain/standings';

const FORM_TITLES: Record<FormResult, string> = { W: 'Won', D: 'Drawn', L: 'Lost' };

interface Props {
  rows: StandingRow[];
  teamHref: (teamId: string) => string;
}

export function StandingsTable({ rows, teamHref }: Props) {
  if (rows.length === 0) return <div className="empty">No teams in this division yet.</div>;

  return (
    <div className="table-wrap">
      <table className="standings">
        <thead>
          <tr>
            <th className="num">#</th>
            <th>Team</th>
            <th className="num" title="Played">
              P
            </th>
            <th className="num" title="Won">
              W
            </th>
            <th className="num" title="Drawn">
              D
            </th>
            <th className="num" title="Lost">
              L
            </th>
            <th className="num" title="Goals for">
              GF
            </th>
            <th className="num" title="Goals against">
              GA
            </th>
            <th className="num" title="Goal difference">
              GD
            </th>
            <th className="num">Pts</th>
            <th className="form-col">Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.teamId}>
              <td className="num">{row.position}</td>
              <td className="team">
                <Link href={teamHref(row.teamId)}>{row.name}</Link>
              </td>
              <td className="num">{row.played}</td>
              <td className="num">{row.won}</td>
              <td className="num">{row.drawn}</td>
              <td className="num">{row.lost}</td>
              <td className="num">{row.goalsFor}</td>
              <td className="num">{row.goalsAgainst}</td>
              <td className="num">
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </td>
              <td className="num pts">{row.points}</td>
              <td className="form-col">
                {row.form.map((f, i) => (
                  <span key={i} className={`form-pill form-${f}`} title={FORM_TITLES[f]}>
                    {f}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
