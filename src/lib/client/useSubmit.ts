'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from './api';

/**
 * Wraps a form submit handler: tracks the pending state, turns thrown errors
 * into a message, resets the form and refreshes the page on success.
 */
export function useSubmit(
  action: (form: FormData) => Promise<unknown>,
  options: { reset?: boolean; fallbackError?: string } = {},
) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    setPending(true);
    setError(null);
    try {
      await action(new FormData(el));
      if (options.reset ?? true) el.reset();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : (options.fallbackError ?? 'Something went wrong'),
      );
    } finally {
      setPending(false);
    }
  }

  return { onSubmit, error, pending };
}
