'use client';

import { api } from '@/lib/client/api';
import { useSubmit } from '@/lib/client/useSubmit';

export function NewDivisionForm({ seasonId }: { seasonId: string }) {
  const { onSubmit, error, pending } = useSubmit((form) =>
    api(`/api/seasons/${seasonId}/divisions`, {
      method: 'POST',
      body: {
        name: form.get('name'),
        format: form.get('format'),
        sortOrder: Number(form.get('sortOrder') || 0),
      },
    }),
  );

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
