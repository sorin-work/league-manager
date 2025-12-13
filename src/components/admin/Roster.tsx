'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

interface Player {
  id: string;
  name: string;
  shirtNumber: number | null;
}

const shirt = (value: FormDataEntryValue | null) => (value ? Number(value) : null);

function PlayerRow({ player }: { player: Player }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api(`/api/players/${player.id}`, {
        method: 'PATCH',
        body: { name: form.get('name'), shirtNumber: shirt(form.get('shirtNumber')) },
      });
      setEditing(false);
      setError(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    }
  }

  async function remove() {
    if (!window.confirm(`Remove ${player.name} from the squad?`)) return;
    try {
      await api(`/api/players/${player.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove');
    }
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save} className="inline-form">
          <input
            name="shirtNumber"
            type="number"
            min={1}
            max={99}
            defaultValue={player.shirtNumber ?? ''}
            className="shirt-input"
          />
          <input name="name" defaultValue={player.name} required />
          <button type="submit" className="button small">
            Save
          </button>
          <button
            type="button"
            className="button secondary small"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </form>
        {error && <p className="field-error">{error}</p>}
      </li>
    );
  }

  return (
    <li>
      <span className="shirt">{player.shirtNumber ?? ''}</span>
      <span className="grow">{player.name}</span>
      <button type="button" className="button secondary small" onClick={() => setEditing(true)}>
        Edit
      </button>
      <button type="button" className="button danger small" onClick={remove}>
        Remove
      </button>
      {error && <span className="field-error">{error}</span>}
    </li>
  );
}

export function Roster({ teamId, players }: { teamId: string; players: Player[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    try {
      await api(`/api/teams/${teamId}/players`, {
        method: 'POST',
        body: { name: form.get('name'), shirtNumber: shirt(form.get('shirtNumber')) },
      });
      el.reset();
      setError(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the player');
    }
  }

  return (
    <>
      {players.length === 0 ? (
        <p className="muted">No players yet.</p>
      ) : (
        <ul className="roster">
          {players.map((p) => (
            <PlayerRow key={p.id} player={p} />
          ))}
        </ul>
      )}
      <h3>Add a player</h3>
      <form onSubmit={add} className="inline-form">
        <input
          name="shirtNumber"
          type="number"
          min={1}
          max={99}
          placeholder="No."
          className="shirt-input"
        />
        <input name="name" placeholder="Player name" required />
        <button type="submit" className="button small">
          Add
        </button>
      </form>
      {error && <p className="alert error">{error}</p>}
    </>
  );
}
