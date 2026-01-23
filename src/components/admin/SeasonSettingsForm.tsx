'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import { TIEBREAKER_LABELS, TIEBREAKERS, type Tiebreaker } from '@/lib/domain/standings';
import type { SeasonDto } from '@/lib/server/services/seasons';

const SLOTS = [0, 1, 2, 3];

export function SeasonSettingsForm({ season }: { season: SeasonDto }) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const num = (key: string) => Number(form.get(key));
    const tiebreakers = SLOTS.map((i) => form.get(`tiebreaker${i}`))
      .filter((v): v is string => typeof v === 'string' && v !== '')
      .map((v) => v as Tiebreaker);

    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/api/seasons/${season.id}`, {
        method: 'PATCH',
        body: {
          name: form.get('name'),
          startDate: form.get('startDate'),
          endDate: form.get('endDate'),
          timezone: form.get('timezone'),
          pointsForWin: num('pointsForWin'),
          pointsForDraw: num('pointsForDraw'),
          pointsForLoss: num('pointsForLoss'),
          tiebreakers,
          yellowCardLimit: num('yellowCardLimit'),
          yellowCardBan: num('yellowCardBan'),
          redCardBan: num('redCardBan'),
          notes: form.get('notes'),
        },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Something went wrong'));
    } finally {
      setPending(false);
    }
  }

  const fieldError = (name: string) =>
    error?.fieldError(name) && <span className="field-error">{error.fieldError(name)}</span>;

  return (
    <form onSubmit={onSubmit} className="form">
      {error && <p className="alert error">{error.message}</p>}
      {saved && <p className="alert success">Saved.</p>}

      <label>
        Name
        <input name="name" defaultValue={season.name} required />
        {fieldError('name')}
      </label>
      <div className="form-row">
        <label>
          First match day
          <input name="startDate" type="date" defaultValue={season.startDate} required />
        </label>
        <label>
          Last match day
          <input name="endDate" type="date" defaultValue={season.endDate} required />
          {fieldError('endDate')}
        </label>
        <label>
          Time zone
          <input name="timezone" defaultValue={season.timezone} required />
          {fieldError('timezone')}
        </label>
      </div>

      <label>
        Notes <span className="hint">shown on the season page; blank lines start a paragraph</span>
        <textarea name="notes" rows={5} defaultValue={season.notes ?? ''} />
        {fieldError('notes')}
      </label>

      <fieldset>
        <legend>Points</legend>
        <div className="form-row">
          <label>
            Win
            <input
              name="pointsForWin"
              type="number"
              min={0}
              max={10}
              defaultValue={season.pointsForWin}
            />
          </label>
          <label>
            Draw
            <input
              name="pointsForDraw"
              type="number"
              min={0}
              max={10}
              defaultValue={season.pointsForDraw}
            />
          </label>
          <label>
            Loss
            <input
              name="pointsForLoss"
              type="number"
              min={0}
              max={10}
              defaultValue={season.pointsForLoss}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Tiebreakers</legend>
        <p className="hint">Used in this order for teams level on points. Name is always last.</p>
        <div className="form-row">
          {SLOTS.map((i) => (
            <label key={i}>
              {i + 1}.
              <select name={`tiebreaker${i}`} defaultValue={season.tiebreakers[i] ?? ''}>
                <option value="">—</option>
                {TIEBREAKERS.map((t) => (
                  <option key={t} value={t}>
                    {TIEBREAKER_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {fieldError('tiebreakers')}
      </fieldset>

      <fieldset>
        <legend>Discipline</legend>
        <div className="form-row">
          <label>
            Yellow cards before a ban
            <input
              name="yellowCardLimit"
              type="number"
              min={1}
              max={20}
              defaultValue={season.yellowCardLimit}
            />
          </label>
          <label>
            Matches banned for yellows
            <input
              name="yellowCardBan"
              type="number"
              min={0}
              max={20}
              defaultValue={season.yellowCardBan}
            />
          </label>
          <label>
            Matches banned for a red
            <input
              name="redCardBan"
              type="number"
              min={0}
              max={20}
              defaultValue={season.redCardBan}
            />
          </label>
        </div>
      </fieldset>

      <div>
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
