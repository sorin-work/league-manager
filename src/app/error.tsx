'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container">
      <section className="card empty">
        <h1>Something went wrong</h1>
        <p>The page could not be loaded. This is usually temporary.</p>
        {error.digest && <p className="muted small">Reference: {error.digest}</p>}
        <button type="button" className="button" onClick={reset}>
          Try again
        </button>
      </section>
    </div>
  );
}
