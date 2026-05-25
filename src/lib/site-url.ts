/** Public base url, from SITE_URL; used for links that leave the page (sitemap, feeds). */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
}
