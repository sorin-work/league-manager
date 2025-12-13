'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

export function NewVenueForm() {
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
      await api('/api/venues', {
        method: 'POST',
        body: { name: form.get('name'), address: form.get('address') },
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
