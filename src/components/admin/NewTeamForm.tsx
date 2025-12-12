'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

interface Props {
  divisionId: string;
  venues: { id: string; name: string }[];
}

export function NewTeamForm({ divisionId, venues }: Props) {
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
      await api(`/api/divisions/${divisionId}/teams`, {
        method: 'POST',
        body: {
          name: form.get('name'),
          shortName: form.get('shortName'),
          homeVenueId: form.get('homeVenueId') || null,
        },
      });
      el.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      {error && <p className="alert error">{error}</p>}
      <div className="form-row">
        <label>
          Team name
          <input name="name" required />
        </label>
        <label>
          Short name
          <input name="shortName" maxLength={5} placeholder="ROV" />
        </label>
        <label>
          Home ground
          <select name="homeVenueId" defaultValue="">
            <option value="">None (shared pitches)</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <button type="submit" className="button" disabled={pending}>
          Add team
        </button>
      </div>
    </form>
  );
}
