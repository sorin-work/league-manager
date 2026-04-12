'use client';

import { api } from '@/lib/client/api';
import { useSubmit } from '@/lib/client/useSubmit';

interface Props {
  divisionId: string;
  venues: { id: string; name: string }[];
}

export function NewTeamForm({ divisionId, venues }: Props) {
  const { onSubmit, error, pending } = useSubmit((form) =>
    api(`/api/divisions/${divisionId}/teams`, {
      method: 'POST',
      body: {
        name: form.get('name'),
        shortName: form.get('shortName'),
        homeVenueId: form.get('homeVenueId') || null,
      },
    }),
  );

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
