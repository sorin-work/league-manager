'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import { DeleteButton } from './DeleteButton';

interface Props {
  divisionId: string;
  teams: { id: string; name: string }[];
  adjustments: { id: string; points: number; reason: string; team: { name: string } }[];
}

export function AdjustmentsPanel({ divisionId, teams, adjustments }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setPending(true);
    setError(null);
    try {
      await api(`/api/divisions/${divisionId}/adjustments`, {
        method: 'POST',
        body: {
          teamId: form.get('teamId'),
          points: Number(form.get('points')),
          reason: form.get('reason'),
        },
      });
      el.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the adjustment');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {adjustments.length === 0 ? (
        <p className="muted">No points adjustments.</p>
      ) : (
        <table>
          <tbody>
            {adjustments.map((a) => (
              <tr key={a.id}>
                <td>{a.team.name}</td>
                <td className="num">
                  <strong>{a.points > 0 ? `+${a.points}` : a.points}</strong>
                </td>
                <td className="muted">{a.reason}</td>
                <td className="num">
                  <DeleteButton
                    url={`/api/adjustments/${a.id}`}
                    label="Remove"
                    confirm={`Remove the ${a.points} point adjustment for ${a.team.name}?`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={onSubmit} className="form">
        {error && <p className="alert error">{error}</p>}
        <div className="form-row">
          <label>
            Team
            <select name="teamId" required>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Points
            <input name="points" type="number" min={-100} max={100} defaultValue={-3} required />
          </label>
        </div>
        <label>
          Reason
          <input name="reason" required placeholder="Fielded a suspended player" />
        </label>
        <div>
          <button type="submit" className="button" disabled={pending || teams.length === 0}>
            Add adjustment
          </button>
        </div>
      </form>
    </>
  );
}
