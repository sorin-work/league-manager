'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

interface Props {
  divisionId: string;
  sources: { id: string; label: string }[];
}

export function CopyTeamsForm({ divisionId, sources }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  if (sources.length === 0) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await api<{ copied: number; skipped: number }>(
        `/api/divisions/${divisionId}/copy-teams`,
        {
          method: 'POST',
          body: {
            fromDivisionId: form.get('fromDivisionId'),
            includePlayers: form.get('includePlayers') === 'on',
          },
        },
      );
      setMessage({
        ok: true,
        text: `Copied ${res.copied} teams${res.skipped ? `, ${res.skipped} were already here` : ''}.`,
      });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Could not copy' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      {message && <p className={`alert ${message.ok ? 'success' : 'error'}`}>{message.text}</p>}
      <div className="form-row">
        <label>
          Copy teams from
          <select name="fromDivisionId">
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="checkbox">
        <input type="checkbox" name="includePlayers" defaultChecked /> Include squads
      </label>
      <div>
        <button type="submit" className="button secondary" disabled={pending}>
          Copy teams
        </button>
      </div>
    </form>
  );
}
