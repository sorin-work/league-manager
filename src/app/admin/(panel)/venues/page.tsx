import { DeleteButton } from '@/components/admin/DeleteButton';
import { NewVenueForm } from '@/components/admin/NewVenueForm';
import { listVenues } from '@/lib/server/services/venues';

export default async function AdminVenuesPage() {
  const venues = await listVenues();

  return (
    <>
      <h1>Venues</h1>
      <div className="two-col">
        <section className="card">
          {venues.length === 0 ? (
            <p className="muted">No venues yet.</p>
          ) : (
            <table>
              <tbody>
                {venues.map((v) => (
                  <tr key={v.id}>
                    <td>{v.name}</td>
                    <td className="muted small">{v.address ?? ''}</td>
                    <td className="num">
                      <DeleteButton
                        url={`/api/venues/${v.id}`}
                        confirm={`Delete ${v.name}? Matches there will have no venue.`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card">
          <h2>New venue</h2>
          <NewVenueForm />
        </section>
      </div>
    </>
  );
}
