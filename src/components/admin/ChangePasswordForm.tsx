'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

export function ChangePasswordForm() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    if (form.get('newPassword') !== form.get('confirm')) {
      setMessage({ ok: false, text: 'The new passwords do not match' });
      return;
    }
    setPending(true);
    try {
      await api('/api/auth/password', {
        method: 'POST',
        body: {
          currentPassword: form.get('currentPassword'),
          newPassword: form.get('newPassword'),
        },
      });
      el.reset();
      setMessage({ ok: true, text: 'Password changed. Other devices have been signed out.' });
    } catch (err) {
      const text =
        err instanceof ApiError
          ? (err.fieldError('newPassword') ?? err.message)
          : 'Could not change it';
      setMessage({ ok: false, text });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      {message && <p className={`alert ${message.ok ? 'success' : 'error'}`}>{message.text}</p>}
      <label>
        Current password
        <input name="currentPassword" type="password" autoComplete="current-password" required />
      </label>
      <label>
        New password <span className="hint">at least 10 characters</span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </label>
      <label>
        Repeat the new password
        <input name="confirm" type="password" autoComplete="new-password" required />
      </label>
      <div>
        <button type="submit" className="button" disabled={pending}>
          Change password
        </button>
      </div>
    </form>
  );
}
