import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findSessionUser, SESSION_COOKIE } from './auth';

/** The admin signed in for the current page request, if any. */
export async function getCurrentAdmin() {
  const store = await cookies();
  return findSessionUser(store.get(SESSION_COOKIE)?.value);
}

/** For admin pages: the signed-in admin, or a redirect to the login page. */
export async function requireAdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
