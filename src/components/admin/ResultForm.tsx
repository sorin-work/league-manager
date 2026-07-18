'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import { EVENT_LABELS, EVENT_TYPES, type EventType } from '@/lib/domain/events';

interface Side {
  id: string;
  name: string;
  players: { id: string; name: string; shirtNumber: number | null }[];
}

interface EventRow {
  key: number;
  playerId: string;
  type: EventType;
  minute: string;
}

interface Props {
  matchId: string;
  home: Side;
  away: Side;
  played: boolean;
  /** Players banned from this match; picking them is allowed but flagged. */
  suspendedIds?: string[];
  homeScore: number | null;
  awayScore: number | null;
  events: { playerId: string; type: EventType; minute: number | null }[];
}

const TYPES = EVENT_TYPES.map((value) => ({ value, label: EVENT_LABELS[value] }));

let nextKey = 1;

export function ResultForm(props: Props) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(String(props.homeScore ?? 0));
  const [awayScore, setAwayScore] = useState(String(props.awayScore ?? 0));
  const [rows, setRows] = useState<EventRow[]>(() =>
    props.events.map((e) => ({
      key: nextKey++,
      playerId: e.playerId,
      type: e.type,
      minute: e.minute ? String(e.minute) : '',
    })),
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const suspended = new Set(props.suspendedIds ?? []);
  const allPlayers = [...props.home.players, ...props.away.players];
  const suspendedNames = allPlayers.filter((p) => suspended.has(p.id)).map((p) => p.name);
  const usedSuspended = rows.some((r) => suspended.has(r.playerId));

  const update = (key: number, patch: Partial<EventRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = (side: Side, type: EventType = 'GOAL') =>
    setRows((rs) => [
      ...rs,
      { key: nextKey++, playerId: side.players[0]?.id ?? '', type, minute: '' },
    ]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      await api(`/api/matches/${props.matchId}/result`, {
        method: 'PUT',
        body: {
          homeScore: Number(homeScore),
          awayScore: Number(awayScore),
          events: rows
            .filter((r) => r.playerId)
            .map((r) => ({
              playerId: r.playerId,
              type: r.type,
              minute: r.minute ? Number(r.minute) : null,
            })),
        },
      });
      setMessage({ ok: true, text: 'Result saved.' });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Could not save' });
    } finally {
      setPending(false);
    }
  }

  const playerOptions = (
    <>
      {[props.home, props.away].map((side) => (
        <optgroup key={side.id} label={side.name}>
          {side.players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.shirtNumber ? `${p.shirtNumber}. ` : ''}
              {p.name}
              {suspended.has(p.id) ? ' (suspended)' : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );

  return (
    <form onSubmit={onSubmit} className="form">
      {message && <p className={`alert ${message.ok ? 'success' : 'error'}`}>{message.text}</p>}
      {suspendedNames.length > 0 && (
        <p className={`alert ${usedSuspended ? 'error' : 'warning'}`}>
          Suspended for this match: {suspendedNames.join(', ')}.
          {usedSuspended && ' A suspended player is listed in the match events.'}
        </p>
      )}
      <div className="score-inputs">
        <label>
          {props.home.name}
          <input
            type="number"
            min={0}
            max={99}
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            required
          />
        </label>
        <span className="dash">–</span>
        <label>
          {props.away.name}
          <input
            type="number"
            min={0}
            max={99}
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            required
          />
        </label>
      </div>

      <fieldset>
        <legend>Scorers and cards</legend>
        {rows.length === 0 && <p className="hint">Nothing recorded yet.</p>}
        {rows.map((r) => (
          <div key={r.key} className="event-row">
            <select
              value={r.type}
              onChange={(e) => update(r.key, { type: e.target.value as EventType })}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={r.playerId}
              onChange={(e) => update(r.key, { playerId: e.target.value })}
            >
              {playerOptions}
            </select>
            <input
              type="number"
              min={1}
              max={130}
              placeholder="Min"
              value={r.minute}
              onChange={(e) => update(r.key, { minute: e.target.value })}
              className="minute-input"
            />
            <button
              type="button"
              className="button secondary small"
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="form-actions">
          <button
            type="button"
            className="button secondary small"
            onClick={() => addRow(props.home)}
          >
            + {props.home.name}
          </button>
          <button
            type="button"
            className="button secondary small"
            onClick={() => addRow(props.away)}
          >
            + {props.away.name}
          </button>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Saving…' : props.played ? 'Update result' : 'Save result'}
        </button>
      </div>
    </form>
  );
}
