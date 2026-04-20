import Link from 'next/link';
import { SignOutButton } from '@/components/admin/SignOutButton';
import { requireAdminPage } from '@/lib/server/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();

  return (
    <div className="container">
      <div className="admin-bar">
        <nav className="admin-nav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/seasons">Seasons</Link>
          <Link href="/admin/venues">Venues</Link>
          <Link href="/admin/users">Admins</Link>
        </nav>
        <div className="admin-user">
          <Link href="/admin/account" className="small">
            {admin.name}
          </Link>
          <SignOutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
