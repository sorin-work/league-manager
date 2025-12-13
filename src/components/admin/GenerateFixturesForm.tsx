'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

interface Props {
  divisionId: string;
  format: 'SINGLE' | 'DOUBLE';
  defaultStart: string;
  venues: { id: string; name: string }[];
}

const list = (value: FormDataEntryValue | null) =>
  String(value ?? '')
    .split(/[\s,]+/)
    .map((v) => v.trim())
    .filter(Boolean);

export function GenerateFixturesForm({ divisionId, format, defaultStart, venues }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api(`/api/divisions/${divisionId}/fixtures`, {
        method: 'POST',
        body: {
          startDate: form.get('startDate'),
          daysBetweenRounds: Number(form.get('daysBetweenRounds')),
          kickoffTimes: list(form.get('kickoffTimes')),
          venueIds: form.getAll('venueIds'),
          skipDates: list(form.get('skipDates')),
          format: form.get('format'),
        },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not generate fixtures');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      {error && <p className="alert error">{error}</p>}
      <div className="form-row">
        <label>
          First match day
          <input name="startDate" type="date" defaultValue={defaultStart} required />
        </label>
        <label>
          Days between rounds
          <input name="daysBetweenRounds" type="number" min={1} max={28} defaultValue={7} />
        </label>
        <label>
          Format
          <select name="format" defaultValue={format}>
            <option value="SINGLE">Play each team once</option>
            <option value="DOUBLE">Home and away</option>
          </select>
        </label>
      </div>
      <label>
        Kick-off times
        <input name="kickoffTimes" defaultValue="10:00" required />
        <span className="hint">
          Comma separated, e.g. 10:00, 12:00. Matches are spread over them.
        </span>
      </label>
      <label>
        Skip dates <span className="hint">optional, comma separated YYYY-MM-DD</span>
        <input name="skipDates" placeholder="2025-12-28, 2026-01-04" />
      </label>
      {venues.length > 0 && (
        <fieldset>
          <legend>Shared venues</legend>
          <p className="hint">Used for teams without a home ground of their own.</p>
          {venues.map((v) => (
            <label key={v.id} className="checkbox">
              <input type="checkbox" name="venueIds" value={v.id} defaultChecked /> {v.name}
            </label>
          ))}
        </fieldset>
      )}
      <div>
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Generating…' : 'Generate fixtures'}
        </button>
      </div>
    </form>
  );
}
