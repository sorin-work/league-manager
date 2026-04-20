import { DeleteButton } from '@/components/admin/DeleteButton';
import { NewAdminForm } from '@/components/admin/NewAdminForm';
import { listAdmins } from '@/lib/server/services/admins';
import { requireAdminPage } from '@/lib/server/session';

export default async function AdminUsersPage() {
  const current = await requireAdminPage();
  const admins = await listAdmins();

  return (
    <>
      <h1>Admin accounts</h1>
      <div className="two-col">
        <section className="card">
          <table>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="muted">{a.email}</td>
                  <td className="num">
                    {a.id === current.id ? (
                      <span className="badge">You</span>
                    ) : (
                      <DeleteButton
                        url={`/api/admins/${a.id}`}
                        label="Remove"
                        confirm={`Remove the admin account of ${a.name}?`}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h2>Add an admin</h2>
          <NewAdminForm />
        </section>
      </div>
    </>
  );
}
