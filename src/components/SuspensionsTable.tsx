import { plural } from '@/lib/format';

interface Row {
  playerId: string;
  playerName: string;
  teamName: string;
  reason: 'YELLOW_CARDS' | 'RED_CARD';
  triggeredByMatchId: string;
  remaining: number;
}

const REASONS = { YELLOW_CARDS: 'Yellow cards', RED_CARD: 'Sent off' };

export function SuspensionsTable({ rows, yellowLimit }: { rows: Row[]; yellowLimit: number }) {
  return (
    <>
      {rows.length === 0 ? (
        <div className="empty">Nobody is suspended at the moment.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Reason</th>
                <th className="num">Still to miss</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={`${s.playerId}-${s.triggeredByMatchId}`}>
                  <td>{s.playerName}</td>
                  <td className="muted">{s.teamName}</td>
                  <td>
                    <span className={s.reason === 'RED_CARD' ? 'card-red' : 'card-yellow'} />
                    {REASONS[s.reason]}
                  </td>
                  <td className="num">{plural(s.remaining, 'match', 'matches')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        A player is suspended after {plural(yellowLimit, 'yellow card')} or a red card.
      </p>
    </>
  );
}
