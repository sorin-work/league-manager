import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SeasonSettingsForm } from '@/components/admin/SeasonSettingsForm';
import { getSeason } from '@/lib/server/services/seasons';

type Props = { params: Promise<{ id: string }> };

export default async function AdminSeasonPage({ params }: Props) {
  const season = await getSeason((await params).id).catch(() => null);
  if (!season) notFound();

  return (
    <>
      <div className="breadcrumbs">
        <Link href="/admin/seasons">Seasons</Link>
      </div>
      <h1>{season.name}</h1>
      <p>
        <Link href={`/seasons/${season.slug}`}>View public page</Link>
      </p>
      <section className="card">
        <h2>Settings</h2>
        <SeasonSettingsForm season={season} />
      </section>
    </>
  );
}
