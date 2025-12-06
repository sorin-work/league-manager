import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container">
      <section className="card empty">
        <h1>Page not found</h1>
        <p>The season, team or match you were looking for doesn&apos;t exist (any more).</p>
        <p>
          <Link href="/">Back to all seasons</Link>
        </p>
      </section>
    </div>
  );
}
