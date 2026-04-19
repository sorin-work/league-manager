import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';
import { requireAdminPage } from '@/lib/server/session';

export default async function AccountPage() {
  const admin = await requireAdminPage();
  return (
    <>
      <h1>Your account</h1>
      <section className="card narrow">
        <p>
          Signed in as <strong>{admin.name}</strong> ({admin.email})
        </p>
        <h2>Change password</h2>
        <ChangePasswordForm />
      </section>
    </>
  );
}
