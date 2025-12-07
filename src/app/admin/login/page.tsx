import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

type Props = { searchParams: Promise<{ next?: string }> };

/** Only follow redirects inside the admin area. */
function safeNext(next: string | undefined) {
  return next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
}

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="container narrow">
      <section className="card">
        <h1>Admin sign in</h1>
        <p className="muted">Sign in to manage seasons, fixtures and results.</p>
        <LoginForm next={safeNext(next)} />
      </section>
    </div>
  );
}
