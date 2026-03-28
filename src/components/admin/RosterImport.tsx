'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

export function RosterImport({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [replace, setReplace] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string; lines?: string[] } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCsv(await file.text());
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await api<{ imported: number }>(`/api/teams/${teamId}/players/import`, {
        method: 'POST',
        body: { csv, replace },
      });
      setMessage({ ok: true, text: `Imported ${res.imported} players.` });
      setCsv('');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const rows = (err.details as unknown as { line: number; message: string }[] | undefined)
          ?.filter((d) => typeof d.line === 'number')
          .map((d) => `Line ${d.line}: ${d.message}`);
        setMessage({ ok: false, text: err.message, lines: rows });
      } else {
        setMessage({ ok: false, text: 'Could not import the file' });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <p className="hint">
        One player per line with a name and, optionally, a shirt number, e.g. exported from a
        spreadsheet.
      </p>
      {message && (
        <div className={`alert ${message.ok ? 'success' : 'error'}`}>
          {message.text}
          {message.lines && message.lines.length > 0 && (
            <ul>
              {message.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} />
      <textarea
        rows={6}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={'name,number\nSam Keeper,1\nBen Striker,9'}
      />
      <label className="checkbox">
        <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
        Replace the current squad
      </label>
      <div>
        <button type="submit" className="button" disabled={pending || csv.trim() === ''}>
          Import players
        </button>
      </div>
    </form>
  );
}
