'use client';

import { api } from '@/lib/client/api';
import { useSubmit } from '@/lib/client/useSubmit';

interface Props {
  divisionId: string;
  round: number;
  matches: {
    id: string;
    home: string;
    away: string;
    homeScore: number | null;
    awayScore: number | null;
    hasEvents: boolean;
  }[];
}

export function RoundScoresForm({ divisionId, round, matches }: Props) {
  const editable = matches.filter((m) => !m.hasEvents);
  const { onSubmit, error, pending } = useSubmit(
    (form) =>
      api(`/api/divisions/${divisionId}/rounds/${round}/scores`, {
        method: 'PUT',
        body: {
          scores: editable
            .filter((m) => form.get(`home-${m.id}`) !== '' && form.get(`away-${m.id}`) !== '')
            .map((m) => ({
              matchId: m.id,
              homeScore: Number(form.get(`home-${m.id}`)),
              awayScore: Number(form.get(`away-${m.id}`)),
            })),
        },
      }),
    { reset: false, fallbackError: 'Could not save the scores' },
  );

  if (editable.length === 0) return null;

  return (
    <form onSubmit={onSubmit} className="form">
      {error && <p className="alert error">{error}</p>}
      <p className="hint">
        Scores only. Matches with scorers or cards are edited on their own page.
      </p>
      {editable.map((m) => (
        <div key={m.id} className="quick-score">
          <span className="home">{m.home}</span>
          <input
            name={`home-${m.id}`}
            type="number"
            min={0}
            max={99}
            defaultValue={m.homeScore ?? ''}
          />
          <span>–</span>
          <input
            name={`away-${m.id}`}
            type="number"
            min={0}
            max={99}
            defaultValue={m.awayScore ?? ''}
          />
          <span>{m.away}</span>
        </div>
      ))}
      <div>
        <button type="submit" className="button" disabled={pending}>
          Save round {round}
        </button>
      </div>
    </form>
  );
}
