import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from '@/middleware';

const req = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, 'http://localhost'), {
    headers: cookie ? { cookie } : {},
  });

describe('admin middleware', () => {
  it('redirects to the login page without a session cookie', () => {
    const res = middleware(req('/admin/seasons?tab=all'));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/admin/login');
    expect(location.searchParams.get('next')).toBe('/admin/seasons?tab=all');
  });

  it('lets the login page through', () => {
    const res = middleware(req('/admin/login'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('lets requests with a session cookie through', () => {
    const res = middleware(req('/admin', 'lm_session=abc'));
    expect(res.headers.get('location')).toBeNull();
  });
});
