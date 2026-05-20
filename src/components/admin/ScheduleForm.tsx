'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

interface Props {
  matchId: string;
  kickoffLocal: string;
  venueId: string | null;
  status: string;
  referee: string | null;
  notes: string | null;
  timeZone: string;
  venues: { id: string; name: string }[];
}

export function ScheduleForm(props: Props) {
  const { matchId, kickoffLocal, venueId, status, timeZone, venues } = props;
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const kickoff = String(form.get('kickoffAt') ?? '');
    setPending(true);
    try {
      await api(`/api/matches/${matchId}`, {
        method: 'PATCH',
        body: {
          kickoffAt: kickoff === '' ? null : kickoff,
          venueId: form.get('venueId') || null,
          status: form.get('status') ?? undefined,
          referee: form.get('referee'),
          notes: form.get('notes'),
        },
      });
      setMessage({ ok: true, text: 'Saved.' });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Could not save' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      {message && <p className={`alert ${message.ok ? 'success' : 'error'}`}>{message.text}</p>}
      <label>
        Kick-off <span className="hint">({timeZone})</span>
        <input name="kickoffAt" type="datetime-local" defaultValue={kickoffLocal} />
      </label>
      <label>
        Venue
        <select name="venueId" defaultValue={venueId ?? ''}>
          <option value="">To be confirmed</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Referee
        <input name="referee" defaultValue={props.referee ?? ''} maxLength={80} />
      </label>
      <label>
        Notes <span className="hint">shown on the match page</span>
        <textarea name="notes" rows={2} defaultValue={props.notes ?? ''} maxLength={500} />
      </label>
      {status !== 'PLAYED' && (
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="SCHEDULED">Scheduled</option>
            <option value="POSTPONED">Postponed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
      )}
      <div>
        <button type="submit" className="button" disabled={pending}>
          Save schedule
        </button>
      </div>
    </form>
  );
}
