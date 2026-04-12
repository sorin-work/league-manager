'use client';

import { api } from '@/lib/client/api';
import { useSubmit } from '@/lib/client/useSubmit';

export function NewVenueForm() {
  const { onSubmit, error, pending } = useSubmit((form) =>
    api('/api/venues', {
      method: 'POST',
      body: { name: form.get('name'), address: form.get('address') },
    }),
  );

  return (
    <form onSubmit={onSubmit} className="form">
      {error && <p className="alert error">{error}</p>}
      <label>
        Name
        <input name="name" required placeholder="Victoria Park" />
      </label>
      <label>
        Address <span className="hint">optional</span>
        <input name="address" />
      </label>
      <div>
        <button type="submit" className="button" disabled={pending}>
          Add venue
        </button>
      </div>
    </form>
  );
}
