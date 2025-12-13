'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

interface Props {
  team: { id: string; name: string; shortName: string | null; homeVenueId: string | null };
  venues: { id: string; name: string }[];
}

export function TeamForm({ team, venues }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      await api(`/api/teams/${team.id}`, {
        method: 'PATCH',
        body: {
          name: form.get('name'),
          shortName: form.get('shortName'),
          homeVenueId: form.get('homeVenueId') || null,
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
        Name
        <input name="name" defaultValue={team.name} required />
      </label>
      <label>
        Short name
        <input name="shortName" defaultValue={team.shortName ?? ''} maxLength={5} />
      </label>
      <label>
        Home ground
        <select name="homeVenueId" defaultValue={team.homeVenueId ?? ''}>
          <option value="">None (shared pitches)</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <div>
        <button type="submit" className="button" disabled={pending}>
          Save team
        </button>
      </div>
    </form>
  );
}
