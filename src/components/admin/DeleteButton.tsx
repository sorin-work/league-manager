'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

interface Props {
  url: string;
  confirm: string;
  label?: string;
  /** Where to go afterwards; stays on the page and refreshes when omitted. */
  redirectTo?: string;
}

export function DeleteButton({ url, confirm, label = 'Delete', redirectTo }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!window.confirm(confirm)) return;
    setPending(true);
    try {
      await api(url, { method: 'DELETE' });
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Could not delete');
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className="button danger small" onClick={onClick} disabled={pending}>
      {label}
    </button>
  );
}
