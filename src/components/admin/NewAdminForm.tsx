'use client';

import { api } from '@/lib/client/api';
import { useSubmit } from '@/lib/client/useSubmit';

export function NewAdminForm() {
  const { onSubmit, error, pending } = useSubmit(
    (form) =>
      api('/api/admins', {
        method: 'POST',
        body: {
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
        },
      }),
    { fallbackError: 'Could not add the account' },
  );

  return (
    <form onSubmit={onSubmit} className="form">
      {error && <p className="alert error">{error}</p>}
      <label>
        Name
        <input name="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Initial password <span className="hint">at least 10 characters, share it safely</span>
        <input
          name="password"
          type="password"
          minLength={10}
          required
          autoComplete="new-password"
        />
      </label>
      <div>
        <button type="submit" className="button" disabled={pending}>
          Add admin
        </button>
      </div>
    </form>
  );
}
