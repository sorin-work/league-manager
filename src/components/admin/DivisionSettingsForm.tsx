'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

interface Props {
  division: {
    id: string;
    name: string;
    format: 'SINGLE' | 'DOUBLE';
    sortOrder: number;
    promotionPlaces: number;
    relegationPlaces: number;
  };
}

export function DivisionSettingsForm({ division }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      await api(`/api/divisions/${division.id}`, {
        method: 'PATCH',
        body: {
          name: form.get('name'),
          format: form.get('format'),
          sortOrder: Number(form.get('sortOrder')),
          promotionPlaces: Number(form.get('promotionPlaces')),
          relegationPlaces: Number(form.get('relegationPlaces')),
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
      <div className="form-row">
        <label>
          Name
          <input name="name" defaultValue={division.name} required />
        </label>
        <label>
          Format
          <select name="format" defaultValue={division.format}>
            <option value="SINGLE">Play each team once</option>
            <option value="DOUBLE">Home and away</option>
          </select>
        </label>
        <label>
          Order
          <input name="sortOrder" type="number" min={0} defaultValue={division.sortOrder} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Promotion places
          <input
            name="promotionPlaces"
            type="number"
            min={0}
            max={10}
            defaultValue={division.promotionPlaces}
          />
        </label>
        <label>
          Relegation places
          <input
            name="relegationPlaces"
            type="number"
            min={0}
            max={10}
            defaultValue={division.relegationPlaces}
          />
        </label>
      </div>
      <div>
        <button type="submit" className="button" disabled={pending}>
          Save division
        </button>
      </div>
    </form>
  );
}
