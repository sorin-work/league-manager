'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: { email: form.get('email'), password: form.get('password') },
      });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in, try again');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form">
      {error && <p className="alert error">{error}</p>}
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button type="submit" className="button" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
