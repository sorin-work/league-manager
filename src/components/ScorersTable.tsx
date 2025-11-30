import type { ScorerRow } from '@/lib/domain/scorers';

export function ScorersTable({ rows }: { rows: ScorerRow[] }) {
  if (rows.length === 0) return <div className="empty">Nobody has scored yet.</div>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="num">#</th>
            <th>Player</th>
            <th>Team</th>
            <th className="num">Goals</th>
            <th className="num" title="Penalties">
              Pens
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.playerId}>
              <td className="num">{row.rank}</td>
              <td>{row.playerName}</td>
              <td className="muted">{row.teamName}</td>
              <td className="num">
                <strong>{row.goals}</strong>
              </td>
              <td className="num">{row.penalties || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
