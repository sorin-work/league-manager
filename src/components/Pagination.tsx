import Link from 'next/link';

interface Props {
  page: number;
  totalPages: number;
  href: (page: number) => string;
}

export function Pagination({ page, totalPages, href }: Props) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pages">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev">
          ← Newer
        </Link>
      ) : (
        <span />
      )}
      <span className="muted small">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next">
          Older →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
