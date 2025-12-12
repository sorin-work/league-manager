'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

export function NewDivisionForm({ seasonId }: { seasonId: string }) {
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
      await api(`/api/seasons/${seasonId}/divisions`, {
        method: 'POST',
        body: {
          name: form.get('name'),
          format: form.get('format'),
          sortOrder: Number(form.get('sortOrder') || 0),
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
          Name
          <input name="name" required placeholder="Division One" />
        </label>
        <label>
          Format
          <select name="format" defaultValue="SINGLE">
            <option value="SINGLE">Play each team once</option>
            <option value="DOUBLE">Home and away</option>
          </select>
        </label>
        <label>
          Order
          <input name="sortOrder" type="number" min={0} defaultValue={0} />
        </label>
      </div>
      <div>
        <button type="submit" className="button" disabled={pending}>
          Add division
        </button>
      </div>
    </form>
  );
}
