import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          League Manager
        </Link>
        <nav className="site-nav">
          <Link href="/">Seasons</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">Fixtures, results and standings for amateur leagues.</div>
    </footer>
  );
}
