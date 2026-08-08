'use client';

export function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button
      type="button"
      className="button secondary small print-hide"
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
