'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

export function NewSeasonForm() {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const { season } = await api<{ season: { id: string } }>('/api/seasons', {
        method: 'POST',
        body: {
          name: form.get('name'),
          startDate: form.get('startDate'),
          endDate: form.get('endDate'),
          timezone: form.get('timezone'),
        },
      });
      router.push(`/admin/seasons/${season.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Something went wrong'));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      {error && <p className="alert error">{error.message}</p>}
      <label>
        Name
        <input name="name" required placeholder="Sunday League 2025/26" />
        {error?.fieldError('name') && (
          <span className="field-error">{error.fieldError('name')}</span>
        )}
      </label>
      <div className="form-row">
        <label>
          First match day
          <input name="startDate" type="date" required />
        </label>
        <label>
          Last match day
          <input name="endDate" type="date" required />
          {error?.fieldError('endDate') && (
            <span className="field-error">{error.fieldError('endDate')}</span>
          )}
        </label>
      </div>
      <label>
        Time zone
        <input name="timezone" defaultValue="Europe/London" required />
        <span className="hint">Kick-off times are entered and shown in this time zone.</span>
      </label>
      <div>
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Creating…' : 'Create season'}
        </button>
      </div>
    </form>
  );
}
