import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/server/db';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const seasons = await prisma.season.findMany({
    where: { status: { not: 'DRAFT' } },
    include: { divisions: { include: { teams: { select: { slug: true } } } } },
  });

  const entries: MetadataRoute.Sitemap = [{ url: `${base}/`, changeFrequency: 'daily' }];
  for (const s of seasons) {
    entries.push({ url: `${base}/seasons/${s.slug}`, lastModified: s.updatedAt });
    for (const d of s.divisions) {
      const divisionUrl = `${base}/seasons/${s.slug}/${d.slug}`;
      entries.push({ url: divisionUrl, changeFrequency: 'weekly' });
      for (const t of d.teams) entries.push({ url: `${divisionUrl}/teams/${t.slug}` });
    }
  }
  return entries;
}
