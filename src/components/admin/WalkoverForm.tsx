'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

interface Props {
  matchId: string;
  homeName: string;
  awayName: string;
}

export function WalkoverForm({ matchId, homeName, awayName }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const winner = form.get('winner');
    const name = winner === 'HOME' ? homeName : awayName;
    if (!window.confirm(`Award the match to ${name}? Any scorers and cards are removed.`)) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/matches/${matchId}/walkover`, {
        method: 'POST',
        body: { winner, goals: Number(form.get('goals')) },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not award the walkover');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      {error && <p className="alert error">{error}</p>}
      <p className="hint">For a team that did not turn up or fielded ineligible players.</p>
      <div className="form-row">
        <label>
          Awarded to
          <select name="winner" defaultValue="HOME">
            <option value="HOME">{homeName}</option>
            <option value="AWAY">{awayName}</option>
          </select>
        </label>
        <label>
          Goals awarded
          <input name="goals" type="number" min={1} max={10} defaultValue={3} />
        </label>
      </div>
      <div>
        <button type="submit" className="button secondary" disabled={pending}>
          Award walkover
        </button>
      </div>
    </form>
  );
}
